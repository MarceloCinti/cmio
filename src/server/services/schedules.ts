import "server-only";
import { db } from "@/server/db";
import { parseInput } from "@/server/action";
import { can, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { z } from "@/lib/validation/zod-es";
import { hhmmToMinutes, minutesToHHMM, WEEKDAY_LABELS } from "@/lib/format";
import { isValidISODate, localToUtc, addDaysISO } from "@/lib/time";
import { ACTIVE_STATUSES } from "./availability";

function assertCanManageSchedule(actor: Actor, professionalId: string | null) {
  if (can(actor, "horarios.gestionar")) return;
  if (professionalId && actor.professionalId === professionalId) return;
  throw new ForbiddenError("No tienes permiso para modificar esta agenda.");
}

export async function getProfessionalSchedule(actor: Actor, professionalId: string) {
  assertCanManageSchedule(actor, professionalId);
  const professional = await db.professional.findUnique({
    where: { id: professionalId },
    select: { id: true, honorific: true, firstName: true, lastName: true, status: true },
  });
  if (!professional) throw new NotFoundError("No encontramos al profesional.");
  const [rules, exceptions] = await Promise.all([
    db.scheduleRule.findMany({ where: { professionalId }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    db.scheduleException.findMany({
      where: { professionalId, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return { professional, rules, exceptions };
}

const rulesInput = z.object({
  weekday: z.array(z.coerce.number().int().min(1).max(7)),
  start: z.array(z.string()),
  end: z.array(z.string()),
});

/** Reemplaza la disponibilidad semanal. No modifica citas ya agendadas. */
export async function replaceScheduleRules(actor: Actor, professionalId: string, input: unknown) {
  assertCanManageSchedule(actor, professionalId);
  const data = parseInput(rulesInput, input);
  const rules: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (let i = 0; i < data.weekday.length; i++) {
    const s = hhmmToMinutes(data.start[i] ?? "");
    const e = hhmmToMinutes(data.end[i] ?? "");
    const day = WEEKDAY_LABELS[data.weekday[i]];
    if (s === null || e === null) throw new ValidationError(`${day}: completa las horas de inicio y fin con el formato HH:MM.`);
    if (e <= s) throw new ValidationError(`${day}: la hora de fin debe ser posterior a la de inicio (${minutesToHHMM(s)}).`);
    if (e - s < 10) throw new ValidationError(`${day}: el bloque debe durar al menos 10 minutos.`);
    rules.push({ weekday: data.weekday[i], startMinute: s, endMinute: e });
  }
  for (let d = 1; d <= 7; d++) {
    const day = rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < day.length; i++) {
      if (day[i].startMinute < day[i - 1].endMinute) {
        throw new ValidationError(`${WEEKDAY_LABELS[d]}: los bloques ${minutesToHHMM(day[i - 1].startMinute)}–${minutesToHHMM(day[i - 1].endMinute)} y ${minutesToHHMM(day[i].startMinute)}–${minutesToHHMM(day[i].endMinute)} se superponen.`);
      }
    }
  }
  await db.$transaction(async (tx) => {
    await tx.scheduleRule.deleteMany({ where: { professionalId } });
    if (rules.length) await tx.scheduleRule.createMany({ data: rules.map((r) => ({ ...r, professionalId })) });
    await audit(actor, { action: "agenda.disponibilidad", entityType: "Professional", entityId: professionalId, details: { bloques: rules.length } }, tx);
  });
  return rules.length;
}

export const exceptionSchema = z
  .object({
    professionalId: z.string().max(64).optional(),
    kind: z.enum(["HOLIDAY", "CLOSURE", "VACATION", "ABSENCE", "BLOCK"], { error: "Selecciona el tipo." }),
    title: z.string({ error: "Indica una descripción." }).trim().min(2, "Indica una descripción.").max(120),
    startDate: z.string().refine(isValidISODate, "Selecciona la fecha de inicio."),
    endDate: z.string().refine(isValidISODate, "Selecciona la fecha de fin."),
    allDay: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "La fecha de fin no puede ser anterior a la de inicio.", path: ["endDate"] });

export async function createScheduleException(actor: Actor, input: unknown) {
  const d = parseInput(exceptionSchema, input);
  const professionalId = d.professionalId || null;
  if (!professionalId || ["HOLIDAY", "CLOSURE"].includes(d.kind)) {
    if (!can(actor, "horarios.gestionar")) throw new ForbiddenError("Solo la administración puede registrar feriados y cierres de la clínica.");
  } else {
    assertCanManageSchedule(actor, professionalId);
  }
  let startsAt: Date;
  let endsAt: Date;
  if (d.allDay) {
    startsAt = localToUtc(d.startDate, 0);
    endsAt = localToUtc(addDaysISO(d.endDate, 1), 0);
  } else {
    const s = hhmmToMinutes(d.startTime ?? "");
    const e = hhmmToMinutes(d.endTime ?? "");
    if (s === null || e === null) throw new ValidationError("Indica la hora de inicio y fin.", { startTime: ["Indica la hora de inicio."], endTime: ["Indica la hora de fin."] });
    startsAt = localToUtc(d.startDate, s);
    endsAt = localToUtc(d.endDate, e);
    if (endsAt <= startsAt) throw new ValidationError("El fin debe ser posterior al inicio.", { endTime: ["El fin debe ser posterior al inicio."] });
  }
  const exception = await db.scheduleException.create({
    data: { professionalId: ["HOLIDAY", "CLOSURE"].includes(d.kind) ? null : professionalId, kind: d.kind, title: d.title, startsAt, endsAt, createdById: actor.id },
  });
  await audit(actor, { action: "agenda.bloqueo_crear", entityType: "ScheduleException", entityId: exception.id, details: { tipo: d.kind, profesional: professionalId } });
  // Citas activas afectadas: no se cancelan automáticamente, la secretaría debe reprogramarlas.
  const affected = await db.appointment.count({
    where: {
      status: { in: ACTIVE_STATUSES },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(exception.professionalId ? { professionalId: exception.professionalId } : {}),
    },
  });
  return { exception, affected };
}

export async function deleteScheduleException(actor: Actor, id: string) {
  const ex = await db.scheduleException.findUnique({ where: { id } });
  if (!ex) throw new NotFoundError("No encontramos el bloqueo.");
  if (!ex.professionalId) {
    if (!can(actor, "horarios.gestionar")) throw new ForbiddenError();
  } else assertCanManageSchedule(actor, ex.professionalId);
  await db.scheduleException.delete({ where: { id } });
  await audit(actor, { action: "agenda.bloqueo_eliminar", entityType: "ScheduleException", entityId: id, details: { titulo: ex.title } });
}

export async function listClinicClosures(actor: Actor) {
  if (!can(actor, "horarios.gestionar")) throw new ForbiddenError();
  return db.scheduleException.findMany({
    where: { professionalId: null, endsAt: { gte: localToUtc(addDaysISO(new Date().toISOString().slice(0, 10), -30), 0) } },
    orderBy: { startsAt: "asc" },
  });
}

export async function affectedAppointments(exception: { startsAt: Date; endsAt: Date; professionalId: string | null }) {
  return db.appointment.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      startsAt: { lt: exception.endsAt },
      endsAt: { gt: exception.startsAt },
      ...(exception.professionalId ? { professionalId: exception.professionalId } : {}),
    },
    select: { id: true, startsAt: true, patient: { select: { firstName: true, lastName: true } } },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
}
