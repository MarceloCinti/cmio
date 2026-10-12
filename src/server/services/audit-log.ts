import "server-only";
import { db } from "@/server/db";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import type { Prisma } from "@/generated/prisma/client";
import { localDayRange } from "@/lib/time";

export type AuditFilters = { fromISO: string; toISO: string; action?: string; actor?: string; patientId?: string; onlyFailures?: boolean; page?: number };

/** Consulta de auditoría (solo lectura: los registros no se pueden editar ni borrar). */
export async function listAuditLogs(actor: Actor, f: AuditFilters) {
  assertCan(actor, "auditoria.ver", "No tienes permiso para consultar la auditoría.");
  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: localDayRange(f.fromISO).start, lt: localDayRange(f.toISO).end },
    ...(f.action ? { action: { startsWith: f.action } } : {}),
    ...(f.actor ? { OR: [{ actorName: { contains: f.actor, mode: "insensitive" } }, { actorId: f.actor }] } : {}),
    ...(f.patientId ? { patientId: f.patientId } : {}),
    ...(f.onlyFailures ? { success: false } : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 }),
    db.auditLog.count({ where }),
  ]);
  await audit(actor, { action: "auditoria.consultar", details: { desde: f.fromISO, hasta: f.toISO, filtro: f.action ?? null } });
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 50)) };
}

export const AUDIT_ACTION_GROUPS: { value: string; label: string }[] = [
  { value: "auth.", label: "Accesos e ingresos" },
  { value: "usuarios.", label: "Usuarios" },
  { value: "roles.", label: "Roles y permisos" },
  { value: "clinica.", label: "Historia clínica" },
  { value: "documentos.", label: "Documentos clínicos" },
  { value: "citas.", label: "Citas" },
  { value: "pacientes.", label: "Pacientes" },
  { value: "informes.", label: "Informes y exportaciones" },
  { value: "configuracion.", label: "Configuración" },
  { value: "contenido.", label: "Contenido del sitio" },
  { value: "catalogo.", label: "Catálogo" },
  { value: "agenda.", label: "Disponibilidad y bloqueos" },
  { value: "mensajes.", label: "Mensajes" },
];
