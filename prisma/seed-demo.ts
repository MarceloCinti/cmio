// Datos de DEMOSTRACIÓN. Crea usuarios, profesionales, pacientes y citas ficticios.
// Solo se ejecuta con DEMO_MODE=true y nunca en producción.
// Uso: DEMO_MODE=true pnpm db:seed:demo

import { hash } from "@node-rs/argon2";
import { DateTime } from "luxon";
import { createScriptClient } from "./script-client";
import type { AppointmentStatus, Role } from "../src/generated/prisma/client";

const db = createScriptClient();
const TZ = "America/Asuncion";

export const DEMO_ACCOUNTS: { email: string; password: string; role: Role; name: string }[] = [
  { email: "propietario@demo.cmio.local", password: "Demo-Propietario-2026", role: "OWNER", name: "Propietario Demo" },
  { email: "admin@demo.cmio.local", password: "Demo-Admin-2026", role: "ADMIN", name: "Administración Demo" },
  { email: "secretaria@demo.cmio.local", password: "Demo-Secretaria-2026", role: "SECRETARY", name: "Secretaría Demo" },
  { email: "medico@demo.cmio.local", password: "Demo-Medico-2026", role: "DOCTOR", name: "Profesional Demo Clínica" },
  { email: "nutricion@demo.cmio.local", password: "Demo-Nutricion-2026", role: "DOCTOR", name: "Profesional Demo Nutrición" },
  { email: "paciente@demo.cmio.local", password: "Demo-Paciente-2026", role: "PATIENT", name: "Paciente Demo Uno" },
];

const hashPw = (p: string) => hash(p, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });

function localDate(daysFromToday: number, hour: number, minute = 0) {
  return DateTime.now().setZone(TZ).startOf("day").plus({ days: daysFromToday }).set({ hour, minute }).toJSDate();
}

async function main() {
  const demo = process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
  if (!demo) throw new Error("Este script requiere DEMO_MODE=true.");
  if (process.env.NODE_ENV === "production") throw new Error("No se cargan datos de demostración en producción.");
  if (await db.user.findUnique({ where: { email: DEMO_ACCOUNTS[0].email } })) {
    console.log("ℹ Los datos de demostración ya existen. No se realizaron cambios.");
    return;
  }

  // En el entorno de demostración se confirman los servicios para mostrar la experiencia completa.
  await db.service.updateMany({ data: { availabilityConfirmed: true, isPublished: true } });
  await db.service.updateMany({ where: { category: { in: ["CONSULTATION", "EVALUATION", "FOLLOW_UP"] } }, data: { bookableOnline: true } });

  const users: Record<string, string> = {};
  for (const acc of DEMO_ACCOUNTS) {
    const u = await db.user.create({
      data: {
        email: acc.email,
        name: acc.name,
        role: acc.role,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        passwordHash: await hashPw(acc.password),
        passwordChangedAt: new Date(),
      },
    });
    users[acc.email] = u.id;
  }

  const specialties = Object.fromEntries((await db.specialty.findMany()).map((s) => [s.slug, s]));
  const services = Object.fromEntries((await db.service.findMany()).map((s) => [s.slug, s]));

  const profClinica = await db.professional.create({
    data: {
      slug: "profesional-demo-clinica",
      honorific: "Dr.",
      firstName: "Profesional",
      lastName: "Demo Clínica",
      bio: "Perfil ficticio para el entorno de demostración. No corresponde a un profesional real.",
      status: "ACTIVE",
      isPublished: true,
      acceptsOnlineBooking: true,
      agendaColor: "#0e6e6b",
      userId: users["medico@demo.cmio.local"],
      sortOrder: 1,
      specialties: { create: [{ specialtyId: specialties["clinica-medica"].id }] },
      services: {
        create: [
          { serviceId: services["consulta-clinica-medica"].id },
          { serviceId: services["seguimiento-medico-metabolico"].id },
          { serviceId: services["evaluacion-preoperatoria"].id },
        ],
      },
      scheduleRules: {
        create: [1, 2, 3, 4, 5].flatMap((weekday) => [
          { weekday, startMinute: 9 * 60, endMinute: 12 * 60 },
          { weekday, startMinute: 14 * 60, endMinute: 18 * 60 },
        ]),
      },
    },
  });

  const profNutri = await db.professional.create({
    data: {
      slug: "profesional-demo-nutricion",
      honorific: "Lic.",
      firstName: "Profesional",
      lastName: "Demo Nutrición",
      bio: "Perfil ficticio para el entorno de demostración. No corresponde a un profesional real.",
      status: "ACTIVE",
      isPublished: true,
      acceptsOnlineBooking: true,
      agendaColor: "#5e9c7c",
      userId: users["nutricion@demo.cmio.local"],
      sortOrder: 2,
      specialties: { create: [{ specialtyId: specialties["nutricion"].id }] },
      services: { create: [{ serviceId: services["consulta-nutricion"].id }, { serviceId: services["evaluacion-nutricional"].id }] },
      scheduleRules: {
        create: [1, 3, 5].map((weekday) => ({ weekday, startMinute: 10 * 60, endMinute: 17 * 60 })).concat([
          { weekday: 2, startMinute: 13 * 60, endMinute: 19 * 60 },
          { weekday: 4, startMinute: 13 * 60, endMinute: 19 * 60 },
        ]),
      },
    },
  });

  // Perfil pendiente de completar: no se publica.
  await db.professional.create({
    data: {
      slug: "perfil-pendiente-cardiologia",
      firstName: "Perfil",
      lastName: "Pendiente Cardiología",
      status: "DRAFT",
      isPublished: false,
      specialties: { create: [{ specialtyId: specialties["cardiologia"].id }] },
      services: { create: [{ serviceId: services["consulta-cardiologia"].id }] },
    },
  });

  const patientsData = [
    { first: "Paciente Demo", last: "Uno", doc: "9000001", userEmail: "paciente@demo.cmio.local" },
    { first: "Paciente Demo", last: "Dos", doc: "9000002" },
    { first: "Paciente Demo", last: "Tres", doc: "9000003" },
    { first: "Paciente Demo", last: "Cuatro", doc: "9000004" },
    { first: "Paciente Demo", last: "Cinco", doc: "9000005" },
  ];
  const patients: { id: string }[] = [];
  for (const [i, p] of patientsData.entries()) {
    const patient = await db.patient.create({
      data: {
        firstName: p.first,
        lastName: p.last,
        documentType: "CI",
        documentNumber: p.doc,
        birthDate: new Date(`198${i}-0${i + 1}-1${i}T00:00:00Z`),
        phone: `0981 000 00${i}`,
        email: p.userEmail ?? `paciente${i + 1}@demo.cmio.local`,
        city: "Capiatá",
        userId: p.userEmail ? users[p.userEmail] : null,
        portalProgressEnabled: i === 0,
        consents: {
          create: [
            { type: "DATA_PROCESSING", granted: true, policyVersion: "demo", source: "SECRETARIA" },
            { type: "EMAIL_NOTIFICATIONS", granted: true, policyVersion: "demo", source: "SECRETARIA" },
            { type: "WHATSAPP_NOTIFICATIONS", granted: i % 2 === 0, policyVersion: "demo", source: "SECRETARIA" },
          ],
        },
      },
    });
    patients.push(patient);
  }

  let code = 1;
  async function appt(
    patientIdx: number,
    prof: { id: string },
    serviceSlug: string,
    day: number,
    hour: number,
    minute: number,
    status: AppointmentStatus,
  ) {
    const service = services[serviceSlug];
    const startsAt = localDate(day, hour, minute);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const a = await db.appointment.create({
      data: {
        code: `DEMO${String(code++).padStart(2, "0")}`,
        patientId: patients[patientIdx].id,
        professionalId: prof.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        status,
        source: patientIdx === 0 ? "PORTAL" : "STAFF",
        confirmedAt: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(status) ? new Date() : null,
        checkedInAt: ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(status) ? startsAt : null,
        completedAt: status === "COMPLETED" ? endsAt : null,
        cancelledAt: status === "CANCELLED" ? new Date() : null,
        cancellationReason: status === "CANCELLED" ? "Cancelada a pedido del paciente (demo)" : null,
        events: { create: { type: "CREATED", toStatus: "SCHEDULED", newStartsAt: startsAt, actorName: "Datos de demostración" } },
      },
    });
    if (status !== "SCHEDULED") {
      await db.appointmentEvent.create({
        data: { appointmentId: a.id, type: "STATUS_CHANGED", fromStatus: "SCHEDULED", toStatus: status, actorName: "Datos de demostración" },
      });
    }
    return a;
  }

  const today = DateTime.now().setZone(TZ).weekday;
  // Agenda de hoy (si es día hábil) para la demostración de recepción.
  if (today <= 5) {
    await appt(1, profClinica, "consulta-clinica-medica", 0, 9, 0, "CONFIRMED");
    await appt(2, profClinica, "consulta-clinica-medica", 0, 9, 30, "SCHEDULED");
    await appt(3, profClinica, "seguimiento-medico-metabolico", 0, 10, 0, "SCHEDULED");
    await appt(4, profNutri, "consulta-nutricion", 0, today % 2 === 1 ? 10 : 13, 0, "CONFIRMED");
  }
  // Historial del paciente con acceso al portal.
  const past1 = await appt(0, profClinica, "consulta-clinica-medica", -60, 9, 0, "COMPLETED");
  const past2 = await appt(0, profNutri, "consulta-nutricion", -30, 10, 0, "COMPLETED");
  await appt(0, profClinica, "seguimiento-medico-metabolico", -14, 14, 0, "NO_SHOW");
  // Próxima cita del paciente demo (siguiente día hábil después de mañana).
  let d = 2;
  while (DateTime.now().setZone(TZ).plus({ days: d }).weekday > 5) d++;
  await appt(0, profClinica, "seguimiento-medico-metabolico", d, 9, 30, "SCHEDULED");
  await appt(1, profNutri, "consulta-nutricion", d, 13, 0, "SCHEDULED");
  await appt(2, profClinica, "consulta-clinica-medica", d + 1, 15, 0, "CANCELLED");

  // Registros clínicos de demostración (ficticios) para el paciente demo.
  const doctorUserId = users["medico@demo.cmio.local"];
  const enc1 = await db.encounter.create({
    data: {
      patientId: patients[0].id,
      professionalId: profClinica.id,
      appointmentId: past1.id,
      reason: "Consulta inicial de demostración",
      assessment: "Registro ficticio para mostrar el funcionamiento del módulo.",
      plan: "Controles periódicos (dato de demostración).",
      patientInstructions: "Indicaciones de ejemplo: mantener los controles programados y consultar ante cualquier duda.",
      sharePatientInstructions: true,
      authorId: doctorUserId,
      authorName: "Profesional Demo Clínica",
      startedAt: past1.startsAt,
      vitalSigns: {
        create: { patientId: patients[0].id, measuredAt: past1.startsAt, weightKg: 98.4, heightCm: 172, bmi: 33.3, waistCm: 108, systolic: 128, diastolic: 82, heartRate: 76, recordedById: doctorUserId },
      },
    },
  });
  await db.encounter.update({ where: { id: enc1.id }, data: { status: "FINALIZED", finalizedAt: past1.endsAt } });
  const enc2 = await db.encounter.create({
    data: {
      patientId: patients[0].id,
      professionalId: profNutri.id,
      appointmentId: past2.id,
      reason: "Control de demostración",
      assessment: "Registro ficticio.",
      authorId: users["nutricion@demo.cmio.local"],
      authorName: "Profesional Demo Nutrición",
      startedAt: past2.startsAt,
      vitalSigns: {
        create: { patientId: patients[0].id, measuredAt: past2.startsAt, weightKg: 96.1, heightCm: 172, bmi: 32.5, waistCm: 105, recordedById: users["nutricion@demo.cmio.local"] },
      },
    },
  });
  await db.encounter.update({ where: { id: enc2.id }, data: { status: "FINALIZED", finalizedAt: past2.endsAt } });
  await db.treatmentGoal.create({
    data: {
      patientId: patients[0].id,
      professionalId: profClinica.id,
      description: "Objetivo de ejemplo definido en el entorno de demostración",
      metric: "WEIGHT",
      targetValue: 90,
      visibleToPatient: true,
    },
  });

  await db.contactRequest.create({
    data: {
      kind: "APPOINTMENT",
      fullName: "Contacto Demo",
      phone: "0981 999 999",
      specialtyId: specialties["nutricion"].id,
      preferredSchedule: "Martes por la tarde",
      consentAccepted: true,
    },
  });

  console.log("✓ Datos de demostración cargados. Cuentas disponibles:");
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(9)} ${a.email}`);
  console.log("  Las contraseñas de demostración están documentadas en docs/DEMO.md");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
