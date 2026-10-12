import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { parseInput } from "@/server/action";
import { AppError, ConflictError, RateLimitError, ValidationError } from "@/server/errors";
import { audit, auditAnonymous } from "@/server/audit";
import type { Actor } from "@/server/auth/actor";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import { consumeRateLimit, enforceRateLimit, resetRateLimit } from "@/server/auth/rate-limit";
import { createSession, invalidateSession, invalidateUserSessions } from "@/server/auth/session";
import { generateToken, sha256Hex } from "@/server/auth/crypto";
import type { TokenPurpose } from "@/generated/prisma/client";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { isoToDbDate } from "@/lib/time";
import { emailStatus } from "@/server/integrations/email";
import { sendSecurityEmail } from "./messaging";
import { getSiteContent } from "./settings";

export type Meta = { ip: string; userAgent: string | null };

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const TOKEN_TTL: Record<TokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  INVITATION: 72 * 60 * 60 * 1000,
};

export const POLICY_VERSION_FALLBACK = "2026-10-borrador";

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
const TOO_MANY = "Demasiados intentos de ingreso. Espera 15 minutos o restablece tu contraseña.";

// ─────────────────────────────────────────────────────────────
// Tokens de un solo uso
// ─────────────────────────────────────────────────────────────

export async function issueToken(userId: string, purpose: TokenPurpose, createdById?: string) {
  // Un token vigente por propósito: se invalidan los anteriores.
  await db.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  const token = generateToken();
  await db.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]),
      createdById: createdById ?? null,
    },
  });
  return token;
}

async function findValidToken(token: string, purpose: TokenPurpose) {
  if (!token || token.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256Hex(token) }, include: { user: true } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Marca el token como usado de forma atómica (evita doble uso concurrente). */
async function consumeToken(id: string) {
  const res = await db.authToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  if (res.count !== 1) throw new AppError("Este enlace ya fue utilizado. Solicita uno nuevo.", "TOKEN_USED");
}

function link(path: string, token: string) {
  return `${env().APP_URL}${path}?token=${encodeURIComponent(token)}`;
}

// ─────────────────────────────────────────────────────────────
// Registro de pacientes
// ─────────────────────────────────────────────────────────────

export function selfRegistrationAvailable() {
  return emailStatus().configured;
}

export async function registerPatient(input: unknown, meta: Meta) {
  const data = parseInput(registerSchema, input);
  await enforceRateLimit(`registro:${meta.ip}`, 5, 60 * 60, "Se crearon varias cuentas desde tu conexión. Intenta más tarde.");
  if (!selfRegistrationAvailable()) {
    throw new AppError(
      "El registro en línea no está disponible en este momento. Comunícate con la secretaría para crear tu acceso.",
      "REGISTRATION_UNAVAILABLE",
    );
  }

  const existingUser = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existingUser) {
    throw new ValidationError("Ya existe una cuenta con ese correo.", {
      email: ["Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña."],
    });
  }
  const existingPatient = await db.patient.findUnique({
    where: { documentType_documentNumber: { documentType: data.documentType, documentNumber: data.documentNumber } },
    select: { id: true },
  });
  if (existingPatient) {
    // No se vincula automáticamente una ficha existente: podría permitir que alguien
    // acceda a documentos de otra persona conociendo su número de documento.
    throw new ValidationError("Ya existe una ficha con ese documento.", {
      documentNumber: [
        "Ya tienes una ficha en la clínica. Comunícate con la secretaría para que te envíe la invitación al portal.",
      ],
    });
  }

  const { legal } = await getSiteContent("published");
  const passwordHash = await hashPassword(data.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        passwordChangedAt: new Date(),
        role: "PATIENT",
        status: "PENDING_VERIFICATION",
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
      },
    });
    const patient = await tx.patient.create({
      data: {
        userId: created.id,
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        birthDate: isoToDbDate(data.birthDate),
        phone: data.phone,
        email: data.email,
      },
    });
    const version = legal.policyVersion || POLICY_VERSION_FALLBACK;
    await tx.consent.createMany({
      data: [
        { patientId: patient.id, type: "DATA_PROCESSING", granted: true, policyVersion: version, source: "PORTAL" },
        { patientId: patient.id, type: "EMAIL_NOTIFICATIONS", granted: data.emailOptIn, policyVersion: version, source: "PORTAL" },
        { patientId: patient.id, type: "WHATSAPP_NOTIFICATIONS", granted: data.whatsappOptIn, policyVersion: version, source: "PORTAL" },
      ],
    });
    await tx.auditLog.create({
      data: {
        actorId: created.id,
        actorName: created.name,
        actorRole: "PATIENT",
        action: "auth.registro_paciente",
        entityType: "User",
        entityId: created.id,
        patientId: patient.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return created;
  });

  const token = await issueToken(user.id, "EMAIL_VERIFICATION");
  await sendSecurityEmail({
    event: "ACCOUNT_VERIFICATION",
    to: user.email,
    name: data.firstName,
    link: link("/verificar-correo", token),
    userId: user.id,
  });
  return { email: user.email };
}

export async function verifyEmail(token: string, meta: Meta) {
  const row = await findValidToken(token, "EMAIL_VERIFICATION");
  if (!row) throw new AppError("El enlace de verificación no es válido o ya venció. Solicita uno nuevo.", "TOKEN_INVALID");
  await consumeToken(row.id);
  await db.user.update({
    where: { id: row.userId },
    data: { status: row.user.status === "PENDING_VERIFICATION" ? "ACTIVE" : row.user.status, emailVerifiedAt: new Date() },
  });
  await auditAnonymous({
    action: "auth.correo_verificado",
    entityType: "User",
    entityId: row.userId,
    actorId: row.userId,
    actorName: row.user.name,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function resendVerification(input: unknown, meta: Meta) {
  const { email } = parseInput(forgotPasswordSchema, input);
  await enforceRateLimit(`reenvio:${meta.ip}`, 5, 60 * 30);
  await enforceRateLimit(`reenvio-correo:${email}`, 3, 60 * 30);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "PENDING_VERIFICATION") return; // respuesta genérica
  const token = await issueToken(user.id, "EMAIL_VERIFICATION");
  await sendSecurityEmail({
    event: "ACCOUNT_VERIFICATION",
    to: user.email,
    name: user.name.split(" ")[0],
    link: link("/verificar-correo", token),
    userId: user.id,
  });
}

// ─────────────────────────────────────────────────────────────
// Ingreso y salida
// ─────────────────────────────────────────────────────────────

export type LoginResult = { token: string; expiresAt: Date; role: string; userId: string };

export async function login(input: unknown, meta: Meta): Promise<LoginResult> {
  const { email, password } = parseInput(loginSchema, input);

  const ipLimit = await consumeRateLimit(`ingreso-ip:${meta.ip}`, 30, 15 * 60);
  const emailLimit = await consumeRateLimit(`ingreso-correo:${email}`, 10, 15 * 60);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    await auditAnonymous({ action: "auth.ingreso_limitado", success: false, ip: meta.ip, userAgent: meta.userAgent, details: { email } });
    throw new RateLimitError(TOO_MANY);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    await burnPasswordCheck(password);
    await auditAnonymous({ action: "auth.ingreso_fallido", success: false, ip: meta.ip, userAgent: meta.userAgent, details: { email } });
    throw new AppError(INVALID_CREDENTIALS, "INVALID_CREDENTIALS");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await burnPasswordCheck(password);
    await auditAnonymous({
      action: "auth.ingreso_bloqueado",
      success: false,
      actorId: user.id,
      actorName: user.name,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw new RateLimitError(TOO_MANY);
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil,
      },
    });
    await auditAnonymous({
      action: lock ? "auth.cuenta_bloqueada" : "auth.ingreso_fallido",
      success: false,
      actorId: user.id,
      actorName: user.name,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (lock) throw new RateLimitError(TOO_MANY);
    throw new AppError(INVALID_CREDENTIALS, "INVALID_CREDENTIALS");
  }

  // A partir de aquí la contraseña es correcta: se pueden dar mensajes específicos.
  if (user.status === "DISABLED") {
    await auditAnonymous({ action: "auth.ingreso_cuenta_desactivada", success: false, actorId: user.id, ip: meta.ip });
    throw new AppError("Tu cuenta está desactivada. Comunícate con la clínica si necesitas recuperar el acceso.", "DISABLED");
  }
  if (user.status === "PENDING_VERIFICATION") {
    throw new AppError(
      "Antes de ingresar, confirma tu correo con el enlace que te enviamos. Si no lo encuentras, solicita uno nuevo.",
      "PENDING_VERIFICATION",
    );
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("Tu cuenta todavía no está activa. Usa el enlace de invitación que recibiste.", "INACTIVE");
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await resetRateLimit(`ingreso-correo:${email}`);
  const session = await createSession(user.id, user.role, meta);
  await auditAnonymous({
    action: "auth.ingreso",
    actorId: user.id,
    actorName: user.name,
    entityType: "User",
    entityId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { token: session.token, expiresAt: session.expiresAt, role: user.role, userId: user.id };
}

export async function logout(actor: Actor & { sessionId: string }) {
  await invalidateSession(actor.sessionId);
  await audit(actor, { action: "auth.salida", entityType: "User", entityId: actor.id });
}

// ─────────────────────────────────────────────────────────────
// Recuperación y cambio de contraseña
// ─────────────────────────────────────────────────────────────

export async function requestPasswordReset(input: unknown, meta: Meta) {
  const { email } = parseInput(forgotPasswordSchema, input);
  await enforceRateLimit(`recuperar-ip:${meta.ip}`, 10, 60 * 60);
  const perEmail = await consumeRateLimit(`recuperar-correo:${email}`, 3, 60 * 60);
  const user = await db.user.findUnique({ where: { email } });
  await auditAnonymous({
    action: "auth.recuperacion_solicitada",
    actorId: user?.id ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: user ? undefined : { email },
  });
  // Respuesta genérica: no se revela si el correo existe.
  if (!perEmail.allowed || !user || user.status === "DISABLED") return;
  if (!["ACTIVE", "PENDING_VERIFICATION"].includes(user.status)) return;
  const token = await issueToken(user.id, "PASSWORD_RESET");
  await sendSecurityEmail({
    event: "PASSWORD_RESET",
    to: user.email,
    name: user.name.split(" ")[0],
    link: link("/restablecer-contrasena", token),
    userId: user.id,
  });
}

export async function checkResetToken(token: string) {
  const row = await findValidToken(token, "PASSWORD_RESET");
  return row ? { email: row.user.email } : null;
}

export async function resetPassword(input: unknown, meta: Meta) {
  const data = parseInput(resetPasswordSchema, input);
  const row = await findValidToken(data.token, "PASSWORD_RESET");
  if (!row) throw new AppError("El enlace para restablecer la contraseña no es válido o ya venció. Solicita uno nuevo.", "TOKEN_INVALID");
  await consumeToken(row.id);
  const passwordHash = await hashPassword(data.password);
  await db.user.update({
    where: { id: row.userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      // Restablecer desde el correo demuestra que la persona controla esa dirección.
      ...(row.user.status === "PENDING_VERIFICATION" ? { status: "ACTIVE" as const, emailVerifiedAt: new Date() } : {}),
    },
  });
  await invalidateUserSessions(row.userId);
  await auditAnonymous({
    action: "auth.contrasena_restablecida",
    actorId: row.userId,
    actorName: row.user.name,
    entityType: "User",
    entityId: row.userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function changePassword(actor: Actor & { sessionId: string }, input: unknown) {
  const data = parseInput(changePasswordSchema, input);
  await enforceRateLimit(`cambio-clave:${actor.id}`, 5, 15 * 60);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  if (!user.passwordHash || !(await verifyPassword(user.passwordHash, data.currentPassword))) {
    await audit(actor, { action: "auth.cambio_contrasena_fallido", success: false });
    throw new ValidationError("La contraseña actual no es correcta.", { currentPassword: ["La contraseña actual no es correcta."] });
  }
  await db.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(data.password), passwordChangedAt: new Date() },
  });
  await invalidateUserSessions(actor.id, actor.sessionId);
  await audit(actor, { action: "auth.cambio_contrasena", entityType: "User", entityId: actor.id });
}

// ─────────────────────────────────────────────────────────────
// Invitaciones (personal y pacientes registrados por la secretaría)
// ─────────────────────────────────────────────────────────────

export async function checkInvitationToken(token: string) {
  const row = await findValidToken(token, "INVITATION");
  return row ? { email: row.user.email, name: row.user.name } : null;
}

export async function acceptInvitation(input: unknown, meta: Meta) {
  const data = parseInput(resetPasswordSchema, input);
  const row = await findValidToken(data.token, "INVITATION");
  if (!row) throw new AppError("La invitación no es válida o ya venció. Pide a la clínica que te envíe una nueva.", "TOKEN_INVALID");
  if (row.user.status === "DISABLED") throw new ConflictError("Esta cuenta está desactivada.");
  await consumeToken(row.id);
  await db.user.update({
    where: { id: row.userId },
    data: {
      passwordHash: await hashPassword(data.password),
      passwordChangedAt: new Date(),
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
  await auditAnonymous({
    action: "auth.invitacion_aceptada",
    actorId: row.userId,
    actorName: row.user.name,
    entityType: "User",
    entityId: row.userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}
