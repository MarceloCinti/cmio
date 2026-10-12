import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { buildActor, type Actor } from "@/server/auth/actor";
import { CONFIGURABLE_ROLES, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";
import { assertTestDatabase } from "./test-env";

const TABLES = [
  "appointment_events",
  "outbound_messages",
  "notifications",
  "encounter_addenda",
  "prescription_items",
  "prescriptions",
  "study_orders",
  "diagnoses",
  "vital_signs",
  "clinical_documents",
  "encounters",
  "appointments",
  "clinical_backgrounds",
  "treatment_goals",
  "consents",
  "patients",
  "schedule_exceptions",
  "schedule_rules",
  "professional_services",
  "professional_specialties",
  "professionals",
  "services",
  "specialties",
  "contact_requests",
  "auth_tokens",
  "sessions",
  "users",
  "rate_limits",
  "role_permissions",
  "site_content",
  "site_content_versions",
  "system_settings",
  "message_templates",
  "faqs",
  "media_assets",
  "audit_logs",
];

/** Vacía todas las tablas (TRUNCATE no dispara los triggers de inmutabilidad por fila). */
export async function resetDatabase() {
  assertTestDatabase(process.env.DATABASE_URL ?? "");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  for (const role of CONFIGURABLE_ROLES) {
    await db.rolePermission.createMany({ data: DEFAULT_ROLE_PERMISSIONS[role].map((permission) => ({ role, permission })) });
  }
}

let counter = 0;
export async function createUser(role: Role, overrides: { email?: string; password?: string; status?: "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "INVITED"; name?: string } = {}) {
  counter++;
  const email = overrides.email ?? `${role.toLowerCase()}${counter}@prueba.local`;
  return db.user.create({
    data: {
      email,
      name: overrides.name ?? `${role} Prueba ${counter}`,
      role,
      status: overrides.status ?? "ACTIVE",
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(overrides.password ?? "Contrasena-Segura-123"),
    },
  });
}

export async function actorFor(userId: string): Promise<Actor> {
  const actor = await buildActor(userId, { ip: "127.0.0.1", userAgent: "vitest" });
  if (!actor) throw new Error("No se pudo construir el actor");
  return actor;
}

export async function createPatient(opts: { withUser?: boolean; firstName?: string; documentNumber?: string } = {}) {
  counter++;
  const user = opts.withUser ? await createUser("PATIENT") : null;
  const patient = await db.patient.create({
    data: {
      userId: user?.id ?? null,
      firstName: opts.firstName ?? `Paciente${counter}`,
      lastName: "Prueba",
      documentType: "CI",
      documentNumber: opts.documentNumber ?? `${1000000 + counter}`,
      phone: "0981000000",
      email: user?.email ?? `paciente${counter}@prueba.local`,
      birthDate: new Date("1985-05-10T00:00:00Z"),
    },
  });
  return { patient, user };
}

/** Lee el último correo escrito por el controlador de archivos en las pruebas. */
export function lastEmailTo(to: string): string | null {
  const dir = path.resolve(process.cwd(), ".data/test-mail");
  let files: string[] = [];
  try {
    files = readdirSync(dir).map((f) => path.join(dir, f));
  } catch {
    return null;
  }
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs || b.localeCompare(a));
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    if (content.includes(`To: ${to}`)) return content;
  }
  return null;
}

export function tokenFromEmail(content: string): string {
  const m = /token=([A-Za-z0-9_-]+)/.exec(content);
  if (!m) throw new Error("No se encontró el token en el correo");
  return m[1];
}

export const META = { ip: "127.0.0.1", userAgent: "vitest" };

/** Profesional activo con un servicio y agenda de 08:00 a 12:00 todos los días. */
export async function createProfessionalWithSchedule(opts: { durationMinutes?: number; capacity?: number; withUser?: boolean } = {}) {
  counter++;
  const user = opts.withUser ? await createUser("DOCTOR") : null;
  const specialty = await db.specialty.create({ data: { slug: `esp-${counter}`, name: `Especialidad ${counter}`, summary: "Prueba" } });
  const service = await db.service.create({
    data: {
      slug: `serv-${counter}`,
      name: `Consulta ${counter}`,
      summary: "Prueba",
      durationMinutes: opts.durationMinutes ?? 30,
      capacityPerSlot: opts.capacity ?? 1,
      availabilityConfirmed: true,
      isPublished: true,
      bookableOnline: true,
      specialtyId: specialty.id,
    },
  });
  const professional = await db.professional.create({
    data: {
      slug: `prof-${counter}`,
      firstName: "Prof",
      lastName: `Prueba ${counter}`,
      status: "ACTIVE",
      isPublished: true,
      acceptsOnlineBooking: true,
      userId: user?.id ?? null,
      specialties: { create: { specialtyId: specialty.id } },
      services: { create: { serviceId: service.id } },
      scheduleRules: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: 8 * 60, endMinute: 12 * 60 })) },
    },
  });
  return { professional, service, specialty, user };
}
