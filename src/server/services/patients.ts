import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { parseInput } from "@/server/action";
import { assertCan, can, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError, isUniqueViolation } from "@/server/errors";
import type { ConsentType, Prisma } from "@/generated/prisma/client";
import { consentPrefsSchema, patientAdminSchema, patientSelfSchema } from "@/lib/validation/patients";
import { isoToDbDate } from "@/lib/time";
import { emailStatus } from "@/server/integrations/email";
import { issueToken } from "./auth";
import { sendSecurityEmail } from "./messaging";
import { getSiteContent } from "./settings";
import { latestConsents } from "./appointment-notifications";

const PAGE_SIZE = 20;

/** Pacientes con los que el profesional tiene relación de atención (citas registradas). */
export async function professionalHasRelationship(professionalId: string, patientId: string) {
  const count = await db.appointment.count({ where: { professionalId, patientId } });
  return count > 0;
}

function canSeeAllPatients(actor: Actor) {
  return can(actor, "pacientes.ver") || can(actor, "pacientes.gestionar") || can(actor, "citas.gestionar");
}

export async function searchPatients(actor: Actor, opts: { q?: string; page?: number }) {
  if (actor.role === "PATIENT") throw new ForbiddenError();
  const all = canSeeAllPatients(actor);
  if (!all && !actor.professionalId) throw new ForbiddenError("No tienes acceso al listado de pacientes.");
  const q = opts.q?.trim() ?? "";
  const digits = q.replace(/\D/g, "");
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 4);
  const where: Prisma.PatientWhereInput = {
    archivedAt: null,
    ...(all ? {} : { appointments: { some: { professionalId: actor.professionalId! } } }),
    ...(q
      ? {
          OR: [
            { AND: terms.map((t) => ({ OR: [{ firstName: { contains: t, mode: "insensitive" as const } }, { lastName: { contains: t, mode: "insensitive" as const } }] })) },
            ...(digits.length >= 3 ? [{ documentNumber: { contains: digits } }, { phone: { contains: digits.slice(-7) } }] : []),
            { documentNumber: { contains: q.toUpperCase().replace(/[.\s]/g, "") } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
        phone: true,
        birthDate: true,
        userId: true,
        appointments: {
          where: { status: { in: ["SCHEDULED", "CONFIRMED"] }, startsAt: { gt: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 1,
          select: { startsAt: true },
        },
      },
    }),
    db.patient.count({ where }),
  ]);
  if (q) await audit(actor, { action: "pacientes.buscar", details: { resultados: total } });
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Datos administrativos (sin información clínica). */
export async function getPatientAdmin(actor: Actor, id: string) {
  if (actor.role === "PATIENT") throw new ForbiddenError();
  const patient = await db.patient.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, status: true, lastLoginAt: true } } },
  });
  if (!patient) throw new NotFoundError("No encontramos la ficha del paciente.");
  if (!canSeeAllPatients(actor)) {
    if (!actor.professionalId || !(await professionalHasRelationship(actor.professionalId, id))) {
      throw new NotFoundError("No encontramos la ficha del paciente.");
    }
  }
  await audit(actor, { action: "pacientes.ver_ficha", entityType: "Patient", entityId: id, patientId: id });
  return { patient, consents: await latestConsents(id) };
}

async function assertDocumentAvailable(documentType: string, documentNumber: string | undefined, exceptId?: string) {
  if (!documentNumber) return;
  const existing = await db.patient.findFirst({
    where: { documentType: documentType as "CI", documentNumber, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true, firstName: true, lastName: true },
  });
  if (existing) {
    throw new ValidationError("Ya existe un paciente con ese documento.", {
      documentNumber: [`Ya existe una ficha con ese documento (${existing.firstName} ${existing.lastName}).`],
    });
  }
}

export async function createPatientRecord(actor: Actor, input: unknown) {
  assertCan(actor, "pacientes.gestionar", "No tienes permiso para registrar pacientes.");
  const data = parseInput(patientAdminSchema, input);
  await assertDocumentAvailable(data.documentType, data.documentNumber);
  const { legal } = await getSiteContent("published");
  try {
    const patient = await db.$transaction(async (tx) => {
      const p = await tx.patient.create({
        data: {
          ...data,
          documentNumber: data.documentNumber ?? null,
          birthDate: data.birthDate ? isoToDbDate(data.birthDate) : null,
          sex: data.sex ?? null,
          createdById: actor.id,
        },
      });
      // Se deja constancia de que el aviso de datos fue informado en recepción.
      await tx.consent.create({
        data: { patientId: p.id, type: "DATA_PROCESSING", granted: true, policyVersion: legal.policyVersion, source: "SECRETARIA", recordedById: actor.id },
      });
      await audit(actor, { action: "pacientes.crear", entityType: "Patient", entityId: p.id, patientId: p.id }, tx);
      return p;
    });
    return patient;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("Ya existe un paciente con ese documento.");
    throw error;
  }
}

export async function updatePatientAdmin(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "pacientes.gestionar", "No tienes permiso para editar pacientes.");
  const data = parseInput(patientAdminSchema, input);
  const existing = await db.patient.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("No encontramos la ficha del paciente.");
  await assertDocumentAvailable(data.documentType, data.documentNumber, id);
  const next = {
    ...data,
    documentNumber: data.documentNumber ?? null,
    birthDate: data.birthDate ? isoToDbDate(data.birthDate) : null,
    sex: data.sex ?? null,
    city: data.city ?? null,
    address: data.address ?? null,
    email: data.email ?? null,
    emergencyContactName: data.emergencyContactName ?? null,
    emergencyContactPhone: data.emergencyContactPhone ?? null,
    insuranceProvider: data.insuranceProvider ?? null,
    adminNotes: data.adminNotes ?? null,
  };
  const changed = Object.keys(next).filter((k) => {
    const before = existing[k as keyof typeof existing];
    const after = next[k as keyof typeof next];
    const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : (v ?? null));
    return norm(before) !== norm(after);
  });
  await db.patient.update({ where: { id }, data: next });
  // Mantiene el nombre visible de la cuenta del portal sincronizado.
  if (existing.userId) {
    await db.user.update({ where: { id: existing.userId }, data: { name: `${data.firstName} ${data.lastName}`, phone: data.phone } });
  }
  await audit(actor, { action: "pacientes.editar", entityType: "Patient", entityId: id, patientId: id, details: { campos: changed } });
}

export async function invitePatientToPortal(actor: Actor, patientId: string): Promise<{ sent: boolean; link?: string }> {
  assertCan(actor, "pacientes.gestionar", "No tienes permiso para invitar pacientes al portal.");
  const patient = await db.patient.findUnique({ where: { id: patientId }, include: { user: true } });
  if (!patient) throw new NotFoundError("No encontramos la ficha del paciente.");
  if (!patient.email) throw new ValidationError("Registra primero el correo electrónico del paciente.");
  if (patient.user?.status === "ACTIVE") throw new ConflictError("El paciente ya tiene acceso activo al portal.");
  const emailInUse = await db.user.findUnique({ where: { email: patient.email.toLowerCase() } });
  if (emailInUse && emailInUse.id !== patient.userId) {
    throw new ConflictError("Ese correo ya está asociado a otra cuenta. Verifica el dato con el paciente.");
  }
  const user =
    patient.user ??
    (await db.user.create({
      data: {
        email: patient.email.toLowerCase(),
        name: `${patient.firstName} ${patient.lastName}`,
        phone: patient.phone,
        role: "PATIENT",
        status: "INVITED",
        createdById: actor.id,
      },
    }));
  if (!patient.userId) await db.patient.update({ where: { id: patientId }, data: { userId: user.id } });
  const token = await issueToken(user.id, "INVITATION", actor.id);
  const link = `${env().APP_URL}/invitacion?token=${encodeURIComponent(token)}`;
  const result = await sendSecurityEmail({ event: "STAFF_INVITATION", to: user.email, name: patient.firstName, link, userId: user.id });
  await audit(actor, { action: "pacientes.invitar_portal", entityType: "Patient", entityId: patientId, patientId, details: { enviado: result.sent } });
  // Si no hay correo configurado, el enlace se muestra una sola vez a quien invitó.
  return result.sent && emailStatus().driver !== "file" ? { sent: true } : { sent: result.sent, link };
}

export async function recordConsent(actor: Actor, patientId: string, type: ConsentType, granted: boolean) {
  const isSelf = actor.role === "PATIENT" && actor.patientId === patientId;
  if (!isSelf) assertCan(actor, "pacientes.gestionar");
  const { legal } = await getSiteContent("published");
  await db.consent.create({
    data: { patientId, type, granted, policyVersion: legal.policyVersion, source: isSelf ? "PORTAL" : "SECRETARIA", recordedById: actor.id },
  });
  await audit(actor, { action: "pacientes.consentimiento", entityType: "Patient", entityId: patientId, patientId, details: { tipo: type, otorgado: granted } });
}

// ─────────────────────────────────────────────────────────────
// Portal del paciente
// ─────────────────────────────────────────────────────────────

function requireOwnPatient(actor: Actor): string {
  if (actor.role !== "PATIENT" || !actor.patientId) throw new ForbiddenError();
  return actor.patientId;
}

export async function getMyPatient(actor: Actor) {
  const id = requireOwnPatient(actor);
  const patient = await db.patient.findUniqueOrThrow({ where: { id } });
  return { patient, consents: await latestConsents(id) };
}

export async function updateMyProfile(actor: Actor, input: unknown) {
  const id = requireOwnPatient(actor);
  const data = parseInput(patientSelfSchema, input);
  await db.patient.update({
    where: { id },
    data: {
      phone: data.phone,
      city: data.city ?? null,
      address: data.address ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      insuranceProvider: data.insuranceProvider ?? null,
    },
  });
  await db.user.update({ where: { id: actor.id }, data: { phone: data.phone } });
  await audit(actor, { action: "portal.actualizar_perfil", entityType: "Patient", entityId: id, patientId: id });
}

export async function updateMyConsents(actor: Actor, input: unknown) {
  const id = requireOwnPatient(actor);
  const data = parseInput(consentPrefsSchema, input);
  const current = await latestConsents(id);
  if (current.EMAIL_NOTIFICATIONS !== data.emailOptIn) await recordConsent(actor, id, "EMAIL_NOTIFICATIONS", data.emailOptIn);
  if (current.WHATSAPP_NOTIFICATIONS !== data.whatsappOptIn) await recordConsent(actor, id, "WHATSAPP_NOTIFICATIONS", data.whatsappOptIn);
}
