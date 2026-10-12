import "server-only";
import { db } from "@/server/db";
import type { Role } from "@/generated/prisma/client";
import { generateToken, sha256Hex } from "./crypto";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Duración de sesión deslizante según el tipo de usuario. */
export function sessionLifetimeMs(role: Role) {
  return role === "PATIENT" ? 14 * DAY : 12 * HOUR;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
};

export type ValidSession = {
  sessionId: string;
  expiresAt: Date;
  user: SessionUser;
};

export async function createSession(
  userId: string,
  role: Role,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs(role));
  await db.session.create({
    data: {
      id: sha256Hex(token),
      userId,
      expiresAt,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<ValidSession | null> {
  if (!token || token.length > 128) return null;
  const sessionId = sha256Hex(token);
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, name: true, role: true, status: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.user.status !== "ACTIVE") {
    await db.session.deleteMany({ where: { id: sessionId } });
    return null;
  }
  let expiresAt = session.expiresAt;
  const lifetime = sessionLifetimeMs(session.user.role);
  // Renovación deslizante: si pasó más de 5 minutos desde la última actividad.
  if (now - session.lastActiveAt.getTime() > 5 * 60 * 1000) {
    expiresAt = new Date(now + lifetime);
    await db.session.update({ where: { id: sessionId }, data: { expiresAt, lastActiveAt: new Date(now) } });
  }
  return { sessionId, expiresAt, user: session.user };
}

export async function invalidateSession(sessionId: string) {
  await db.session.deleteMany({ where: { id: sessionId } });
}

export async function invalidateUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({ where: { userId, ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}) } });
}

export async function purgeExpiredSessions() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
