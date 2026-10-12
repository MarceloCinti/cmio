import "server-only";
import { db, type Tx } from "@/server/db";
import { z } from "@/lib/validation/zod-es";
import { parseInput } from "@/server/action";
import { assertCan, can, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { generateReadableCode } from "@/server/auth/crypto";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  errorText,
  isExclusionViolation,
  isUniqueViolation,
} from "@/server/errors";
import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { localDayRange, localISODateOf, todayISO } from "@/lib/time";
import { formatLongDateTime } from "@/lib/format";
import { ACTIVE_STATUSES, isSlotAvailable } from "./availability";
import { getSystemSetting } from "./settings";
import { notifyAppointmentEvent } from "./appointment-notifications";
import { notifyStaff } from "./notifications";

// ─────────────────────────────────────────────────────────────
// Reglas de transición de estados
// ─────────────────────────────────────────────────────────────

export const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  // Corrección: el paciente llegó tarde después de haber sido marcado ausente.
  NO_SHOW: ["CHECKED_IN"],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus) {
  return TRANSITIONS[from].includes(to);
}

const appointmentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, phone: true, documentNumber: true, userId: true } },
  professional: { select: { id: true, honorific: true, firstName: true, lastName: true, userId: true, agendaColor: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

// ─────────────────────────────────────────────────────────────
// Autorización
// ─────────────────────────────────────────────────────────────

type AccessLevel = "view" | "manage";

function isOwnPatient(actor: Actor, appt: { patientId: string }) {
  return actor.role === "PATIENT" && actor.patientId === appt.patientId;
}

function isOwnProfessional(actor: Actor, appt: { professionalId: string }) {
  return actor.professionalId !== null && actor.professionalId === appt.professionalId;
}

export function canAccessAppointment(actor: Actor, appt: { patientId: string; professionalId: string }, level: AccessLevel) {
  if (isOwnPatient(actor, appt)) return true;
  if (actor.role === "PATIENT") return false;
  if (isOwnProfessional(actor, appt)) return true;
  if (level === "view") return can(actor, "agenda.ver_todas") || can(actor, "citas.gestionar") || can(actor, "recepcion.gestionar");
  return can(actor, "citas.gestionar") || can(actor, "recepcion.gestionar");
}

export async function getAppointmentForActor(actor: Actor, id: string, level: AccessLevel = "view") {
  const appt = await db.appointment.findUnique({ where: { id }, include: appointmentInclude });
  if (!appt || !canAccessAppointment(actor, appt, level)) throw new NotFoundError("No encontramos la cita.");
  return appt;
}

// ─────────────────────────────────────────────────────────────
// Reserva
// ─────────────────────────────────────────────────────────────

export const bookingSchema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente.").max(64).optional(),
  professionalId: z.string({ error: "Selecciona un profesional." }).min(1, "Selecciona un profesional.").max(64),
  serviceId: z.string({ error: "Selecciona un servicio." }).min(1, "Selecciona un servicio.").max(64),
  startsAt: z
    .string({ error: "Selecciona un horario." })
    .min(1, "Selecciona un horario.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Selecciona un horario válido."),
  overbook: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
  overbookEndsAt: z.string().optional(),
  reason: z.string().trim().max(300).optional(),
  patientComment: z.string().trim().max(300).optional(),
  adminNotes: z.string().trim().max(500).optional(),
});

const SLOT_TAKEN = "Ese horario acaba de ser reservado por otra persona. Elige otro horario disponible.";
const PATIENT_OVERLAP = "El paciente ya tiene otra cita en ese horario. Elige un horario diferente.";

function translateBookingError(error: unknown): never {
  if (isExclusionViolation(error)) {
    if (errorText(error).includes("no_overlap_patient")) throw new ConflictError(PATIENT_OVERLAP);
    throw new ConflictError(SLOT_TAKEN);
  }
  throw error;
}

async function lockProfessionalAgenda(tx: Tx, professionalId: string) {
  // Serializa las reservas del mismo profesional dentro de la transacción.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agenda:${professionalId}`}))`;
}

async function uniqueCode(tx: Tx) {
  for (let i = 0; i < 5; i++) {
    const code = generateReadableCode(6);
    const exists = await tx.appointment.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new AppError("No se pudo generar el código de la cita. Intenta nuevamente.");
}

export async function bookAppointment(actor: Actor, input: unknown) {
  const data = parseInput(bookingSchema, input);
  const isPatient = actor.role === "PATIENT";
  const startsAt = new Date(data.startsAt);
  const policy = await getSystemSetting("booking");

  let patientId: string;
  if (isPatient) {
    if (!actor.patientId) throw new ForbiddenError("Tu cuenta no tiene una ficha de paciente asociada.");
    patientId = actor.patientId;
    if (data.overbook) throw new ForbiddenError();
  } else {
    assertCan(actor, "citas.gestionar", "No tienes permiso para agendar citas.");
    if (!data.patientId) throw new ValidationError("Selecciona un paciente.", { patientId: ["Selecciona un paciente."] });
    patientId = data.patientId;
    if (data.overbook) {
      assertCan(actor, "citas.sobreturno", "No tienes permiso para agendar sobreturnos.");
      if (!data.reason || data.reason.length < 3) {
        throw new ValidationError("Indica el motivo del sobreturno.", { reason: ["Indica el motivo del sobreturno."] });
      }
    }
  }

  const [patient, professional, service] = await Promise.all([
    db.patient.findUnique({ where: { id: patientId }, select: { id: true, archivedAt: true, userId: true, firstName: true, lastName: true } }),
    db.professional.findUnique({
      where: { id: data.professionalId },
      select: { id: true, status: true, isPublished: true, acceptsOnlineBooking: true, firstName: true, lastName: true, honorific: true },
    }),
    db.service.findUnique({ where: { id: data.serviceId } }),
  ]);
  if (!patient || patient.archivedAt) throw new NotFoundError("No encontramos la ficha del paciente.");
  if (!professional || professional.status !== "ACTIVE") throw new ValidationError("El profesional seleccionado no está disponible.", { professionalId: ["El profesional seleccionado no está disponible."] });
  if (!service) throw new ValidationError("El servicio seleccionado no existe.", { serviceId: ["Selecciona un servicio."] });

  if (isPatient) {
    if (!service.bookableOnline || !service.availabilityConfirmed || !service.isPublished) {
      throw new ValidationError("Este servicio no puede agendarse en línea. Comunícate con la secretaría.");
    }
    if (!professional.acceptsOnlineBooking || !professional.isPublished) {
      throw new ValidationError("Este profesional no recibe reservas en línea. Comunícate con la secretaría.");
    }
    const active = await db.appointment.count({
      where: { patientId, status: { in: ["SCHEDULED", "CONFIRMED"] }, startsAt: { gt: new Date() } },
    });
    if (active >= policy.maxActiveAppointmentsPerPatient) {
      throw new ConflictError(
        `Ya tienes ${active} citas próximas. Para agendar otra, cancela o espera a que se realice alguna, o comunícate con la secretaría.`,
      );
    }
  }

  if (startsAt.getTime() < Date.now() - 60_000) throw new ValidationError("No se pueden agendar citas en horarios pasados.");

  const dateISO = localISODateOf(startsAt);
  const durationEnd = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  try {
    const appointment = await db.$transaction(async (tx) => {
      await lockProfessionalAgenda(tx, professional.id);
      let endsAt = durationEnd;
      if (!data.overbook) {
        const check = await isSlotAvailable({
          tx,
          professionalId: professional.id,
          serviceId: service.id,
          fromISO: dateISO,
          toISO: dateISO,
          startsAt,
          policy: isPatient ? policy : null,
        });
        if (!check.ok) throw new ConflictError(SLOT_TAKEN.replace("acaba de ser reservado por otra persona", "no está disponible"));
        endsAt = check.endsAt!;
      }
      const created = await tx.appointment.create({
        data: {
          code: await uniqueCode(tx),
          patientId,
          professionalId: professional.id,
          serviceId: service.id,
          startsAt,
          endsAt,
          status: "SCHEDULED",
          source: isPatient ? "PORTAL" : "STAFF",
          blocksSlot: !data.overbook && service.capacityPerSlot <= 1,
          isOverbook: Boolean(data.overbook),
          patientComment: isPatient ? (data.patientComment ?? null) : null,
          adminNotes: !isPatient ? (data.adminNotes ?? null) : null,
          createdById: actor.id,
        },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: created.id,
          type: "CREATED",
          toStatus: "SCHEDULED",
          newStartsAt: startsAt,
          reason: data.overbook ? `Sobreturno: ${data.reason}` : null,
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      await audit(
        actor,
        {
          action: data.overbook ? "citas.sobreturno" : "citas.crear",
          entityType: "Appointment",
          entityId: created.id,
          patientId,
          details: { inicio: startsAt.toISOString(), profesional: professional.id, servicio: service.id },
        },
        tx,
      );
      return created;
    });
    await notifyAppointmentEvent(appointment.id, "APPOINTMENT_BOOKED");
    if (isPatient) {
      const settings = await getSystemSetting("notifications");
      if (settings.notifyStaffOnPortalBooking) {
        await notifyStaff("citas.gestionar", {
          title: "Nueva cita agendada desde el portal",
          body: `${patient.firstName} ${patient.lastName} agendó ${service.name} para el ${formatLongDateTime(startsAt)}.`,
          href: `/panel/citas/${appointment.id}`,
        });
      }
    }
    return appointment;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("No se pudo generar la cita. Intenta nuevamente.");
    return translateBookingError(error);
  }
}

// ─────────────────────────────────────────────────────────────
// Cambios de estado
// ─────────────────────────────────────────────────────────────

const STATUS_EVENT: Partial<Record<AppointmentStatus, "APPOINTMENT_CONFIRMED" | "APPOINTMENT_CANCELLED">> = {
  CONFIRMED: "APPOINTMENT_CONFIRMED",
  CANCELLED: "APPOINTMENT_CANCELLED",
};

type StatusCheckAppt = { patientId: string; professionalId: string; status: AppointmentStatus; startsAt: Date };
type StatusPolicy = { confirmWindowHours: number; patientCancelMinHours: number };

/**
 * Evalúa si el actor puede llevar la cita al estado indicado. Devuelve null si está
 * permitido o el error correspondiente. La interfaz usa esta misma función para
 * mostrar solo las acciones válidas.
 */
export function checkStatusChange(actor: Actor, appt: StatusCheckAppt, to: AppointmentStatus, policy: StatusPolicy, now = new Date()): AppError | null {
  if (actor.role === "PATIENT") {
    if (!isOwnPatient(actor, appt)) return new NotFoundError("No encontramos la cita.");
    if (to === "CONFIRMED") {
      if (now.getTime() < appt.startsAt.getTime() - policy.confirmWindowHours * 3600_000) {
        return new ConflictError(`Podrás confirmar tu asistencia desde ${policy.confirmWindowHours} horas antes de la cita.`);
      }
    } else if (to === "CANCELLED") {
      if (now.getTime() > appt.startsAt.getTime() - policy.patientCancelMinHours * 3600_000) {
        return new ConflictError(
          `Las cancelaciones en línea se permiten hasta ${policy.patientCancelMinHours} horas antes. Comunícate con la secretaría.`,
        );
      }
    } else {
      return new ForbiddenError();
    }
  } else {
    const own = isOwnProfessional(actor, appt);
    const reception = can(actor, "recepcion.gestionar");
    const manage = can(actor, "citas.gestionar");
    const allowed =
      (to === "CONFIRMED" && (manage || reception || own)) ||
      (to === "CANCELLED" && (manage || own)) ||
      ((to === "CHECKED_IN" || to === "NO_SHOW") && (reception || own)) ||
      ((to === "IN_PROGRESS" || to === "COMPLETED") && own);
    if (!allowed) {
      if (to === "IN_PROGRESS" || to === "COMPLETED") return new ForbiddenError("Solo el profesional asignado puede iniciar o finalizar la consulta.");
      return new ForbiddenError();
    }
  }
  if (appt.status === to) return null;
  if (!canTransition(appt.status, to)) {
    return new ConflictError(`No se puede pasar de «${APPOINTMENT_STATUS_LABELS[appt.status]}» a «${APPOINTMENT_STATUS_LABELS[to]}».`);
  }
  const sameDay = localISODateOf(appt.startsAt) === todayISO();
  if ((to === "CHECKED_IN" || to === "IN_PROGRESS") && !sameDay) {
    return new ConflictError("La llegada y el inicio de la consulta solo pueden registrarse el día de la cita.");
  }
  if (to === "NO_SHOW" && now < appt.startsAt) {
    return new ConflictError("Solo se puede marcar la ausencia después de la hora de inicio de la cita.");
  }
  if (["CANCELLED", "CONFIRMED"].includes(to) && appt.startsAt.getTime() < now.getTime() - 12 * 3600_000) {
    return new ConflictError("No se puede confirmar ni cancelar una cita que ya pasó. Registra la ausencia si corresponde.");
  }
  return null;
}

/** Acciones de estado disponibles para mostrar en la interfaz. */
export function availableStatusActions(actor: Actor, appt: StatusCheckAppt, policy: StatusPolicy, now = new Date()): AppointmentStatus[] {
  return TRANSITIONS[appt.status].filter((to) => checkStatusChange(actor, appt, to, policy, now) === null);
}

export async function changeAppointmentStatus(actor: Actor, id: string, to: AppointmentStatus, reason?: string | null) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt) throw new NotFoundError("No encontramos la cita.");
  const policy = await getSystemSetting("booking");
  const now = new Date();
  const problem = checkStatusChange(actor, appt, to, policy, now);
  if (problem) throw problem;
  if (appt.status === to) return appt;
  if (to === "CANCELLED" && actor.role !== "PATIENT" && (!reason || reason.trim().length < 3)) {
    throw new ValidationError("Indica el motivo de la cancelación.", { reason: ["Indica el motivo de la cancelación."] });
  }
  if (to === "CHECKED_IN" && appt.status === "NO_SHOW" && (!reason || reason.trim().length < 3)) {
    throw new ValidationError("Indica el motivo de la corrección.", { reason: ["Indica el motivo de la corrección."] });
  }

  const timestamps: Prisma.AppointmentUpdateInput = {};
  if (to === "CONFIRMED") timestamps.confirmedAt = now;
  if (to === "CHECKED_IN") timestamps.checkedInAt = now;
  if (to === "IN_PROGRESS") timestamps.startedAt = now;
  if (to === "COMPLETED") timestamps.completedAt = now;
  if (to === "CANCELLED") {
    timestamps.cancelledAt = now;
    timestamps.cancelledById = actor.id;
    timestamps.cancellationReason = reason?.trim() || (actor.role === "PATIENT" ? "Cancelada por el paciente desde el portal" : null);
  }

  const updated = await db.$transaction(async (tx) => {
    // Actualización condicionada al estado leído (evita carreras entre dos usuarios).
    const res = await tx.appointment.updateMany({ where: { id, status: appt.status }, data: { status: to, ...(timestamps as Prisma.AppointmentUpdateManyMutationInput) } });
    if (res.count !== 1) throw new ConflictError("La cita fue modificada por otra persona. Actualiza la página e inténtalo de nuevo.");
    await tx.appointmentEvent.create({
      data: {
        appointmentId: id,
        type: "STATUS_CHANGED",
        fromStatus: appt.status,
        toStatus: to,
        reason: reason?.trim() || null,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    await audit(
      actor,
      { action: "citas.cambio_estado", entityType: "Appointment", entityId: id, patientId: appt.patientId, details: { de: appt.status, a: to } },
      tx,
    );
    return tx.appointment.findUniqueOrThrow({ where: { id } });
  });

  const event = STATUS_EVENT[to];
  if (event && !(to === "CONFIRMED" && actor.role === "PATIENT")) await notifyAppointmentEvent(id, event);
  if (to === "CANCELLED" && actor.role === "PATIENT") {
    await notifyStaff("citas.gestionar", {
      title: "Cita cancelada por el paciente",
      body: `Se canceló la cita del ${formatLongDateTime(appt.startsAt)}.`,
      href: `/panel/citas/${id}`,
    });
  }
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Reprogramación
// ─────────────────────────────────────────────────────────────

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1).max(64),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Selecciona un horario válido."),
  professionalId: z.string().max(64).optional(),
  reason: z.string().trim().max(300).optional(),
});

export async function rescheduleAppointment(actor: Actor, input: unknown) {
  const data = parseInput(rescheduleSchema, input);
  const appt = await db.appointment.findUnique({ where: { id: data.appointmentId }, include: { service: true } });
  if (!appt) throw new NotFoundError("No encontramos la cita.");
  const policy = await getSystemSetting("booking");
  const isPatient = actor.role === "PATIENT";
  const newStart = new Date(data.startsAt);
  const professionalId = data.professionalId || appt.professionalId;

  if (isPatient) {
    if (!isOwnPatient(actor, appt)) throw new NotFoundError("No encontramos la cita.");
    if (!policy.allowPatientReschedule) throw new ConflictError("La reprogramación en línea no está habilitada. Comunícate con la secretaría.");
    if (professionalId !== appt.professionalId) throw new ForbiddenError();
    if (Date.now() > appt.startsAt.getTime() - policy.patientRescheduleMinHours * 3600_000) {
      throw new ConflictError(
        `Las reprogramaciones en línea se permiten hasta ${policy.patientRescheduleMinHours} horas antes. Comunícate con la secretaría.`,
      );
    }
  } else {
    assertCan(actor, "citas.gestionar", "No tienes permiso para reprogramar citas.");
  }
  if (!["SCHEDULED", "CONFIRMED"].includes(appt.status)) {
    throw new ConflictError("Solo se pueden reprogramar citas programadas o confirmadas.");
  }
  if (newStart.getTime() === appt.startsAt.getTime() && professionalId === appt.professionalId) {
    throw new ValidationError("Elige un horario diferente al actual.");
  }

  const dateISO = localISODateOf(newStart);
  try {
    await db.$transaction(async (tx) => {
      await lockProfessionalAgenda(tx, professionalId);
      if (professionalId !== appt.professionalId) await lockProfessionalAgenda(tx, appt.professionalId);
      const check = await isSlotAvailable({
        tx,
        professionalId,
        serviceId: appt.serviceId,
        fromISO: dateISO,
        toISO: dateISO,
        startsAt: newStart,
        policy: isPatient ? policy : null,
        ignoreAppointmentId: appt.id,
      });
      if (!check.ok) throw new ConflictError("El nuevo horario no está disponible. Elige otro.");
      const res = await tx.appointment.updateMany({
        where: { id: appt.id, status: appt.status, startsAt: appt.startsAt },
        data: {
          startsAt: newStart,
          endsAt: check.endsAt!,
          professionalId,
          status: "SCHEDULED",
          confirmedAt: null,
          reminderQueuedAt: null,
        },
      });
      if (res.count !== 1) throw new ConflictError("La cita fue modificada por otra persona. Actualiza la página e inténtalo de nuevo.");
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appt.id,
          type: "RESCHEDULED",
          fromStatus: appt.status,
          toStatus: "SCHEDULED",
          previousStartsAt: appt.startsAt,
          newStartsAt: newStart,
          reason: data.reason ?? (isPatient ? "Reprogramada por el paciente desde el portal" : null),
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      await audit(
        actor,
        {
          action: "citas.reprogramar",
          entityType: "Appointment",
          entityId: appt.id,
          patientId: appt.patientId,
          details: { antes: appt.startsAt.toISOString(), despues: newStart.toISOString(), profesional: professionalId },
        },
        tx,
      );
    });
  } catch (error) {
    return translateBookingError(error);
  }
  await notifyAppointmentEvent(appt.id, "APPOINTMENT_RESCHEDULED");
  if (isPatient) {
    await notifyStaff("citas.gestionar", {
      title: "Cita reprogramada por el paciente",
      body: `Nueva fecha: ${formatLongDateTime(newStart)}.`,
      href: `/panel/citas/${appt.id}`,
    });
  }
}

export async function updateAppointmentNotes(actor: Actor, id: string, adminNotes: string) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt || !canAccessAppointment(actor, appt, "manage") || actor.role === "PATIENT") throw new NotFoundError("No encontramos la cita.");
  await db.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { adminNotes: adminNotes.trim().slice(0, 500) || null } });
    await tx.appointmentEvent.create({ data: { appointmentId: id, type: "UPDATED", reason: "Observación administrativa actualizada", actorId: actor.id, actorName: actor.name } });
  });
}

// ─────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────

export async function listAgenda(
  actor: Actor,
  opts: { fromISO: string; toISO: string; professionalId?: string | null; statuses?: AppointmentStatus[] },
) {
  if (actor.role === "PATIENT") throw new ForbiddenError();
  let professionalFilter: string | undefined = opts.professionalId ?? undefined;
  if (!can(actor, "agenda.ver_todas") && !can(actor, "recepcion.gestionar") && !can(actor, "citas.gestionar")) {
    if (!actor.professionalId) throw new ForbiddenError("No tienes acceso a la agenda.");
    professionalFilter = actor.professionalId; // solo su propia agenda
  }
  return db.appointment.findMany({
    where: {
      startsAt: { gte: localDayRange(opts.fromISO).start, lt: localDayRange(opts.toISO).end },
      ...(professionalFilter ? { professionalId: professionalFilter } : {}),
      ...(opts.statuses?.length ? { status: { in: opts.statuses } } : {}),
    },
    include: appointmentInclude,
    orderBy: [{ startsAt: "asc" }],
  });
}

export async function listPatientAppointments(actor: Actor, patientId: string) {
  if (actor.role === "PATIENT" && actor.patientId !== patientId) throw new ForbiddenError();
  if (actor.role !== "PATIENT" && !can(actor, "pacientes.ver") && !can(actor, "citas.gestionar") && !actor.professionalId) {
    throw new ForbiddenError();
  }
  return db.appointment.findMany({ where: { patientId }, include: appointmentInclude, orderBy: { startsAt: "desc" }, take: 100 });
}

export async function getAppointmentEvents(actor: Actor, appointmentId: string) {
  await getAppointmentForActor(actor, appointmentId, "view");
  const events = await db.appointmentEvent.findMany({ where: { appointmentId }, orderBy: { createdAt: "asc" } });
  if (actor.role !== "PATIENT") return events;
  // El paciente ve el historial de su cita, pero no las notas internas del personal
  // (motivos de sobreturno, correcciones). Solo se le muestra el motivo de una cancelación.
  return events.map((e) => ({ ...e, reason: e.toStatus === "CANCELLED" ? e.reason : null }));
}

export function nextActiveAppointmentWhere(patientId: string): Prisma.AppointmentWhereInput {
  return { patientId, status: { in: ACTIVE_STATUSES }, endsAt: { gt: new Date() } };
}
