import "server-only";
import { db } from "@/server/db";
import type { Role } from "@/generated/prisma/client";
import { PERMISSION_KEYS, ROLE_PERMISSION_CEILING, type ConfigurableRole, type Permission } from "@/lib/permissions";
import { ForbiddenError } from "@/server/errors";

/**
 * Identidad y capacidades del usuario que ejecuta una operación.
 * Todos los servicios de dominio reciben un Actor y validan permisos en el servidor.
 */
export type Actor = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: ReadonlySet<Permission>;
  /** Perfil profesional activo vinculado (habilita la historia clínica). */
  professionalId: string | null;
  /** Ficha de paciente vinculada (portal del paciente). */
  patientId: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function permissionsForRole(role: Role): Promise<Set<Permission>> {
  if (role === "OWNER") return new Set(PERMISSION_KEYS);
  if (role === "PATIENT") return new Set();
  const rows = await db.rolePermission.findMany({ where: { role }, select: { permission: true } });
  // Defensa en profundidad: nunca más permisos que el límite del rol, aunque la tabla los tenga.
  const valid = new Set<string>(ROLE_PERMISSION_CEILING[role as ConfigurableRole] ?? []);
  return new Set(rows.map((r) => r.permission).filter((p): p is Permission => valid.has(p)));
}

export async function buildActor(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<Actor | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      professional: { select: { id: true, status: true } },
      patient: { select: { id: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: await permissionsForRole(user.role),
    // Solo las cuentas con rol de profesional obtienen acceso clínico por su perfil vinculado.
    professionalId: user.role === "DOCTOR" && user.professional && user.professional.status === "ACTIVE" ? user.professional.id : null,
    patientId: user.role === "PATIENT" ? (user.patient?.id ?? null) : null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  };
}

export function can(actor: Actor, permission: Permission) {
  return actor.role === "OWNER" || actor.permissions.has(permission);
}

export function canAny(actor: Actor, ...permissions: Permission[]) {
  return permissions.some((p) => can(actor, p));
}

export function assertCan(actor: Actor, permission: Permission, message?: string) {
  if (!can(actor, permission)) throw new ForbiddenError(message);
}

export function assertStaff(actor: Actor) {
  if (actor.role === "PATIENT") throw new ForbiddenError();
}

export function isClinician(actor: Actor) {
  return actor.role === "DOCTOR" && actor.professionalId !== null;
}

export function assertClinician(actor: Actor) {
  if (!isClinician(actor)) {
    throw new ForbiddenError("Solo los profesionales de la salud pueden acceder a la historia clínica.");
  }
}

/** Actor de sistema para tareas programadas (recordatorios, mantenimiento). */
export const SYSTEM_ACTOR: Actor = {
  id: "system",
  name: "Sistema",
  email: "sistema@cmio.local",
  role: "OWNER",
  permissions: new Set(PERMISSION_KEYS),
  professionalId: null,
  patientId: null,
};
