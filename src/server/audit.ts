import "server-only";
import { db, type Tx } from "@/server/db";
import type { Actor } from "@/server/auth/actor";
import type { Prisma } from "@/generated/prisma/client";

export type AuditEntry = {
  action: string;
  entityType?: string;
  entityId?: string;
  patientId?: string | null;
  success?: boolean;
  details?: Record<string, unknown>;
};

// Claves que nunca deben quedar en la auditoría.
const FORBIDDEN_KEYS = /pass|token|secret|hash|contrasena|contraseña/i;

function sanitize(details?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  if (!details) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (FORBIDDEN_KEYS.test(k)) continue;
    if (typeof v === "string" && v.length > 500) out[k] = `${v.slice(0, 500)}…`;
    else out[k] = v;
  }
  return out as Prisma.InputJsonValue;
}

export async function audit(actor: Actor | null, entry: AuditEntry, tx?: Tx) {
  const client = tx ?? db;
  await client.auditLog.create({
    data: {
      actorId: actor && actor.id !== "system" ? actor.id : null,
      actorName: actor?.name ?? null,
      actorRole: actor && actor.id !== "system" ? actor.role : null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      patientId: entry.patientId ?? null,
      success: entry.success ?? true,
      ipAddress: actor?.ip ?? null,
      userAgent: actor?.userAgent ?? null,
      details: sanitize(entry.details),
    },
  });
}

/** Registro para eventos sin actor autenticado (p. ej., intentos de ingreso fallidos). */
export async function auditAnonymous(
  entry: AuditEntry & { ip?: string | null; userAgent?: string | null; actorId?: string | null; actorName?: string | null },
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorName: entry.actorName ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      patientId: entry.patientId ?? null,
      success: entry.success ?? true,
      ipAddress: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      details: sanitize(entry.details),
    },
  });
}
