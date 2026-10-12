import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  bookAppointment,
  changeAppointmentStatus,
  getAppointmentForActor,
  listAgenda,
  rescheduleAppointment,
} from "@/server/services/appointments";
import { getAvailability } from "@/server/services/availability";
import { queueDueReminders } from "@/server/services/appointment-notifications";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { addDaysISO, localToUtc, todayISO } from "@/lib/time";
import { actorFor, createPatient, createProfessionalWithSchedule, createUser, resetDatabase } from "../helpers/db";

const day = (n: number) => addDaysISO(todayISO(), n);
const at = (n: number, minute: number) => localToUtc(day(n), minute).toISOString();

async function setup() {
  const { professional, service, user: doctorUser } = await createProfessionalWithSchedule({ withUser: true });
  const { patient, user: patientUser } = await createPatient({ withUser: true });
  const secretary = await createUser("SECRETARY");
  return {
    professional,
    service,
    patient,
    doctor: await actorFor(doctorUser!.id),
    patientActor: await actorFor(patientUser!.id),
    secretary: await actorFor(secretary.id),
  };
}

describe("Disponibilidad", () => {
  beforeEach(resetDatabase);

  it("devuelve turnos reales y excluye los ocupados", async () => {
    const s = await setup();
    const before = await getAvailability({ professionalId: s.professional.id, serviceId: s.service.id, fromISO: day(3), toISO: day(3) });
    expect(before[0].slots).toHaveLength(8);
    await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 540) });
    const after = await getAvailability({ professionalId: s.professional.id, serviceId: s.service.id, fromISO: day(3), toISO: day(3) });
    expect(after[0].slots.filter((x) => !x.available).map((x) => x.startsAt.toISOString())).toEqual([at(3, 540)]);
  });

  it("no ofrece turnos en feriados de la clínica", async () => {
    const s = await setup();
    await db.scheduleException.create({
      data: { kind: "HOLIDAY", title: "Feriado de prueba", startsAt: localToUtc(day(4), 0), endsAt: localToUtc(day(5), 0) },
    });
    const res = await getAvailability({ professionalId: s.professional.id, serviceId: s.service.id, fromISO: day(4), toISO: day(4) });
    expect(res[0].slots.some((x) => x.available)).toBe(false);
  });
});

describe("Reservas", () => {
  beforeEach(resetDatabase);

  it("el paciente reserva un turno disponible y queda registrada la trazabilidad", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2, 600) });
    expect(appt.status).toBe("SCHEDULED");
    expect(appt.source).toBe("PORTAL");
    expect(appt.patientId).toBe(s.patient.id);
    expect(appt.endsAt.getTime() - appt.startsAt.getTime()).toBe(30 * 60_000);
    const events = await db.appointmentEvent.findMany({ where: { appointmentId: appt.id } });
    expect(events.map((e) => e.type)).toEqual(["CREATED"]);
    expect(await db.auditLog.count({ where: { action: "citas.crear", entityId: appt.id } })).toBe(1);
    // Se registra el correo de confirmación (sin información clínica)
    const msg = await db.outboundMessage.findFirst({ where: { appointmentId: appt.id, channel: "EMAIL" } });
    expect(msg?.event).toBe("APPOINTMENT_BOOKED");
  });

  it("el paciente no puede reservar a nombre de otro paciente", async () => {
    const s = await setup();
    const other = await createPatient();
    const appt = await bookAppointment(s.patientActor, {
      patientId: other.patient.id,
      professionalId: s.professional.id,
      serviceId: s.service.id,
      startsAt: at(2, 600),
    });
    expect(appt.patientId).toBe(s.patient.id);
  });

  it("rechaza horarios fuera de la agenda real", async () => {
    const s = await setup();
    await expect(
      bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2, 13 * 60) }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2, 9 * 60 + 10) }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("previene reservas duplicadas ante solicitudes simultáneas", async () => {
    const s = await setup();
    const patients = await Promise.all(Array.from({ length: 8 }, () => createPatient()));
    const results = await Promise.allSettled(
      patients.map(({ patient }) =>
        bookAppointment(s.secretary, { patientId: patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(5, 600) }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(7);
    for (const f of failed) {
      expect(f.reason).toBeInstanceOf(ConflictError);
      expect(f.reason.message).toMatch(/horario/);
    }
    expect(await db.appointment.count({ where: { professionalId: s.professional.id } })).toBe(1);
  });

  it("la base de datos rechaza superposiciones aunque se omita la validación de la aplicación", async () => {
    const s = await setup();
    const other = await createPatient();
    const base = {
      code: "AAA111",
      patientId: s.patient.id,
      professionalId: s.professional.id,
      serviceId: s.service.id,
      startsAt: new Date(at(6, 600)),
      endsAt: new Date(at(6, 630)),
      source: "STAFF" as const,
    };
    await db.appointment.create({ data: base });
    await expect(
      db.appointment.create({ data: { ...base, code: "BBB222", patientId: other.patient.id, startsAt: new Date(at(6, 615)), endsAt: new Date(at(6, 645)) } }),
    ).rejects.toThrow();
  });

  it("impide que un paciente tenga dos citas superpuestas con distintos profesionales", async () => {
    const s = await setup();
    const second = await createProfessionalWithSchedule();
    await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    await expect(
      bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: second.professional.id, serviceId: second.service.id, startsAt: at(3, 600) }),
    ).rejects.toThrow(/ya tiene otra cita/);
  });

  it("solo quien tiene permiso puede agendar sobreturnos, con motivo", async () => {
    const s = await setup();
    const other = await createPatient();
    await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 540) });
    await expect(
      bookAppointment(s.secretary, { patientId: other.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 540), overbook: "on" }),
    ).rejects.toBeInstanceOf(ValidationError);
    const over = await bookAppointment(s.secretary, {
      patientId: other.patient.id,
      professionalId: s.professional.id,
      serviceId: s.service.id,
      startsAt: at(3, 540),
      overbook: "on",
      reason: "Paciente con indicación de control urgente",
    });
    expect(over.isOverbook).toBe(true);
    expect(over.blocksSlot).toBe(false);
    await expect(
      bookAppointment(s.doctor, { patientId: other.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("limita la cantidad de citas activas por paciente desde el portal", async () => {
    const s = await setup();
    for (let i = 0; i < 3; i++) {
      await bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2 + i, 540) });
    }
    await expect(
      bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(6, 540) }),
    ).rejects.toThrow(/Ya tienes 3 citas/);
  });
});

describe("Cancelación, confirmación y reprogramación", () => {
  beforeEach(resetDatabase);

  it("el paciente cancela dentro del plazo y la cita conserva su historial", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    await changeAppointmentStatus(s.patientActor, appt.id, "CANCELLED");
    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appt.id }, include: { events: true } });
    expect(updated.status).toBe("CANCELLED");
    expect(updated.cancelledById).toBe(s.patientActor.id);
    expect(updated.events.map((e) => e.type)).toEqual(["CREATED", "STATUS_CHANGED"]);
    // El horario queda libre nuevamente
    const again = await bookAppointment(s.secretary, { patientId: (await createPatient()).patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    expect(again.id).not.toBe(appt.id);
  });

  it("el paciente no puede cancelar en línea fuera del plazo de la política", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(1, 9 * 60) });
    await db.appointment.update({ where: { id: appt.id }, data: { startsAt: new Date(Date.now() + 3 * 3600_000), endsAt: new Date(Date.now() + 3.5 * 3600_000) } });
    await expect(changeAppointmentStatus(s.patientActor, appt.id, "CANCELLED")).rejects.toThrow(/24 horas antes/);
  });

  it("la secretaría debe indicar el motivo al cancelar", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    await expect(changeAppointmentStatus(s.secretary, appt.id, "CANCELLED")).rejects.toBeInstanceOf(ValidationError);
    await changeAppointmentStatus(s.secretary, appt.id, "CANCELLED", "El paciente avisó por teléfono");
    const ev = await db.appointmentEvent.findFirstOrThrow({ where: { appointmentId: appt.id, type: "STATUS_CHANGED" } });
    expect(ev.reason).toBe("El paciente avisó por teléfono");
    expect(ev.actorName).toBe(s.secretary.name);
  });

  it("rechaza transiciones inválidas y acciones de quien no corresponde", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    await expect(changeAppointmentStatus(s.secretary, appt.id, "COMPLETED")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(changeAppointmentStatus(s.doctor, appt.id, "COMPLETED")).rejects.toThrow(/No se puede pasar/);
    await expect(changeAppointmentStatus(s.secretary, appt.id, "CHECKED_IN")).rejects.toThrow(/día de la cita/);
    await expect(changeAppointmentStatus(s.secretary, appt.id, "NO_SHOW")).rejects.toThrow(/después de la hora/);
    await expect(changeAppointmentStatus(s.patientActor, appt.id, "CHECKED_IN")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("recorre el flujo completo del día de la consulta", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2, 600) });
    // Simula que la cita es hoy
    const start = new Date(Date.now() + 60_000);
    await db.appointment.update({ where: { id: appt.id }, data: { startsAt: start, endsAt: new Date(start.getTime() + 30 * 60_000) } });
    await changeAppointmentStatus(s.secretary, appt.id, "CONFIRMED");
    await changeAppointmentStatus(s.secretary, appt.id, "CHECKED_IN");
    await changeAppointmentStatus(s.doctor, appt.id, "IN_PROGRESS");
    await changeAppointmentStatus(s.doctor, appt.id, "COMPLETED");
    const final = await db.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(final.status).toBe("COMPLETED");
    expect(final.checkedInAt && final.startedAt && final.completedAt).toBeTruthy();
    expect(await db.appointmentEvent.count({ where: { appointmentId: appt.id } })).toBe(5);
  });

  it("reprograma validando disponibilidad y vuelve a estado programada", async () => {
    const s = await setup();
    const other = await createPatient();
    const appt = await bookAppointment(s.patientActor, { professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(3, 600) });
    await bookAppointment(s.secretary, { patientId: other.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(4, 600) });
    await expect(rescheduleAppointment(s.patientActor, { appointmentId: appt.id, startsAt: at(4, 600) })).rejects.toBeInstanceOf(ConflictError);
    await rescheduleAppointment(s.patientActor, { appointmentId: appt.id, startsAt: at(4, 660) });
    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(updated.startsAt.toISOString()).toBe(at(4, 660));
    expect(updated.status).toBe("SCHEDULED");
    const ev = await db.appointmentEvent.findFirstOrThrow({ where: { appointmentId: appt.id, type: "RESCHEDULED" } });
    expect(ev.previousStartsAt?.toISOString()).toBe(at(3, 600));
  });
});

describe("Acceso a la agenda", () => {
  beforeEach(resetDatabase);

  it("un profesional solo ve su propia agenda y los pacientes solo sus citas", async () => {
    const s = await setup();
    const second = await createProfessionalWithSchedule();
    const other = await createPatient({ withUser: true });
    const mine = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(2, 540) });
    const notMine = await bookAppointment(s.secretary, { patientId: other.patient.id, professionalId: second.professional.id, serviceId: second.service.id, startsAt: at(2, 540) });
    const agenda = await listAgenda(s.doctor, { fromISO: day(0), toISO: day(10), professionalId: second.professional.id });
    expect(agenda.map((a) => a.id)).toEqual([mine.id]);
    await expect(getAppointmentForActor(s.doctor, notMine.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getAppointmentForActor(s.patientActor, notMine.id)).rejects.toBeInstanceOf(NotFoundError);
    const all = await listAgenda(s.secretary, { fromISO: day(0), toISO: day(10) });
    expect(all).toHaveLength(2);
  });
});

describe("Recordatorios", () => {
  beforeEach(resetDatabase);

  it("encola un único recordatorio por horario usando la hora real de la cita", async () => {
    const s = await setup();
    const appt = await bookAppointment(s.secretary, { patientId: s.patient.id, professionalId: s.professional.id, serviceId: s.service.id, startsAt: at(1, 600) });
    const start = new Date(Date.now() + 5 * 3600_000);
    await db.appointment.update({ where: { id: appt.id }, data: { startsAt: start, endsAt: new Date(start.getTime() + 1800_000) } });
    expect(await queueDueReminders()).toBe(1);
    expect(await queueDueReminders()).toBe(0);
    const reminders = await db.outboundMessage.findMany({ where: { appointmentId: appt.id, event: "APPOINTMENT_REMINDER" } });
    expect(reminders.length).toBeGreaterThanOrEqual(1);
    const email = reminders.find((r) => r.channel === "EMAIL")!;
    expect(email.body).toContain("Te recordamos tu cita");
    expect(email.body).not.toMatch(/diagn|tratamiento/i);
  });
});
