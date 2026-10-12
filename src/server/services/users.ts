import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { parseInput } from "@/server/action";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { invalidateUserSessions } from "@/server/auth/session";
import { z } from "@/lib/validation/zod-es";
import { emailField, personName } from "@/lib/validation/common";
import {
  CONFIGURABLE_ROLES,
  PERMISSION_KEYS,
  ROLE_PERMISSION_CEILING,
  ROLE_RANK,
  type ConfigurableRole,
  type Permission,
  type RoleKey,
} from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";
import { emailStatus } from "@/server/integrations/email";
import { issueToken } from "./auth";
import { sendSecurityEmail } from "./messaging";

const STAFF_ROLES = ["OWNER", "ADMIN", "SECRETARY", "DOCTOR"] as const;

/** Un usuario solo puede asignar roles de menor jerarquía (el propietario también puede designar propietarios). */
export function canAssignRole(actor: Actor, role: RoleKey) {
  if (role === "PATIENT") return false;
  if (actor.role === "OWNER") return true;
  return ROLE_RANK[actor.role] > ROLE_RANK[role];
}

function canManageUser(actor: Actor, target: { id: string; role: Role }) {
  if (target.id === actor.id) return false;
  if (actor.role === "OWNER") return true;
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role];
}

export async function listStaffUsers(actor: Actor) {
  assertCan(actor, "usuarios.gestionar");
  return db.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      lockedUntil: true,
      professional: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export const inviteSchema = z.object({
  name: personName("el nombre"),
  email: emailField,
  role: z.enum(STAFF_ROLES, { error: "Selecciona un rol." }),
  professionalId: z.string().max(64).optional(),
});

export async function inviteStaffUser(actor: Actor, input: unknown): Promise<{ sent: boolean; link?: string }> {
  assertCan(actor, "usuarios.gestionar", "No tienes permiso para invitar usuarios.");
  const data = parseInput(inviteSchema, input);
  if (!canAssignRole(actor, data.role)) throw new ForbiddenError("No puedes asignar un rol igual o superior al tuyo.");
  if (await db.user.findUnique({ where: { email: data.email } })) {
    throw new ValidationError("Ya existe un usuario con ese correo.", { email: ["Ya existe un usuario con ese correo."] });
  }
  let professionalId: string | null = null;
  if (data.professionalId) {
    // Vincular un perfil da acceso clínico: solo el propietario y solo para cuentas de profesional.
    if (actor.role !== "OWNER") throw new ForbiddenError("Solo el propietario puede vincular una cuenta a un perfil profesional.");
    if (data.role !== "DOCTOR") throw new ValidationError("Solo las cuentas con rol de profesional pueden vincularse a un perfil profesional.");
    const p = await db.professional.findUnique({ where: { id: data.professionalId } });
    if (!p) throw new ValidationError("El perfil profesional no existe.");
    if (p.userId) throw new ConflictError("Ese perfil profesional ya tiene una cuenta vinculada.");
    professionalId = p.id;
  }
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name: data.name, email: data.email, role: data.role, status: "INVITED", createdById: actor.id } });
    if (professionalId) await tx.professional.update({ where: { id: professionalId }, data: { userId: u.id } });
    await audit(actor, { action: "usuarios.invitar", entityType: "User", entityId: u.id, details: { rol: data.role, perfilProfesional: professionalId } }, tx);
    return u;
  });
  return sendInvitation(actor, user.id);
}

async function sendInvitation(actor: Actor, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await issueToken(user.id, "INVITATION", actor.id);
  const link = `${env().APP_URL}/invitacion?token=${encodeURIComponent(token)}`;
  const res = await sendSecurityEmail({ event: "STAFF_INVITATION", to: user.email, name: user.name.split(" ")[0], link, userId: user.id });
  // Sin correo real configurado, el enlace de una cuenta del personal se muestra una única vez a
  // quien invita. Nunca se muestra el de una cuenta de paciente.
  if (user.role === "PATIENT") return { sent: res.sent };
  return res.sent && emailStatus().driver === "smtp" ? { sent: true } : { sent: res.sent, link };
}

export async function resendInvitation(actor: Actor, userId: string) {
  assertCan(actor, "usuarios.gestionar");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("No encontramos al usuario.");
  if (!canManageUser(actor, user)) throw new ForbiddenError();
  if (user.status !== "INVITED") throw new ConflictError("Solo se pueden reenviar invitaciones pendientes.");
  await audit(actor, { action: "usuarios.reenviar_invitacion", entityType: "User", entityId: userId });
  return sendInvitation(actor, userId);
}

export async function changeUserRole(actor: Actor, userId: string, role: RoleKey) {
  assertCan(actor, "usuarios.gestionar");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("No encontramos al usuario.");
  if (user.id === actor.id) throw new ForbiddenError("No puedes modificar tu propio rol.");
  if (user.role === "PATIENT" || role === "PATIENT") throw new ForbiddenError("Los roles de pacientes no se modifican desde aquí.");
  if (!canManageUser(actor, user) || !canAssignRole(actor, role)) throw new ForbiddenError("No puedes asignar un rol igual o superior al tuyo.");
  if (user.role === "OWNER" && role !== "OWNER") {
    const owners = await db.user.count({ where: { role: "OWNER", status: "ACTIVE" } });
    if (owners <= 1) throw new ConflictError("Debe existir al menos un propietario activo.");
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  await invalidateUserSessions(userId);
  await audit(actor, { action: "usuarios.cambio_rol", entityType: "User", entityId: userId, details: { de: user.role, a: role } });
}

export async function setUserActive(actor: Actor, userId: string, active: boolean) {
  assertCan(actor, "usuarios.gestionar");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("No encontramos al usuario.");
  if (user.id === actor.id) throw new ForbiddenError("No puedes desactivar tu propia cuenta.");
  if (user.role !== "PATIENT" && !canManageUser(actor, user)) throw new ForbiddenError();
  if (!active && user.role === "OWNER") {
    const owners = await db.user.count({ where: { role: "OWNER", status: "ACTIVE" } });
    if (owners <= 1) throw new ConflictError("Debe existir al menos un propietario activo.");
  }
  await db.user.update({
    where: { id: userId },
    data: active
      ? { status: user.passwordHash ? "ACTIVE" : "INVITED", disabledAt: null, failedLoginCount: 0, lockedUntil: null }
      : { status: "DISABLED", disabledAt: new Date() },
  });
  if (!active) await invalidateUserSessions(userId);
  await audit(actor, { action: active ? "usuarios.reactivar" : "usuarios.desactivar", entityType: "User", entityId: userId });
}

export async function unlockUser(actor: Actor, userId: string) {
  assertCan(actor, "usuarios.gestionar");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !canManageUser(actor, user)) throw new ForbiddenError();
  await db.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
  await audit(actor, { action: "usuarios.desbloquear", entityType: "User", entityId: userId });
}

// ─────────────────────────────────────────────────────────────
// Permisos por rol (solo el propietario)
// ─────────────────────────────────────────────────────────────

export async function getRolePermissionMatrix(actor: Actor) {
  if (actor.role !== "OWNER") throw new ForbiddenError("Solo el propietario puede gestionar roles y permisos.");
  const rows = await db.rolePermission.findMany();
  return Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r, rows.filter((x) => x.role === r).map((x) => x.permission)])) as Record<ConfigurableRole, string[]>;
}

export async function setRolePermissions(actor: Actor, role: ConfigurableRole, permissions: string[]) {
  if (actor.role !== "OWNER") throw new ForbiddenError("Solo el propietario puede gestionar roles y permisos.");
  if (!CONFIGURABLE_ROLES.includes(role)) throw new ValidationError("Rol inválido.");
  const valid = permissions.filter((p): p is Permission => (PERMISSION_KEYS as string[]).includes(p));
  const ceiling = new Set(ROLE_PERMISSION_CEILING[role]);
  const rejected = valid.filter((p) => !ceiling.has(p));
  if (rejected.length) throw new ValidationError("Algunos permisos no pueden asignarse a este rol.");
  const before: string[] = (await db.rolePermission.findMany({ where: { role } })).map((r) => r.permission);
  await db.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { role } });
    if (valid.length) await tx.rolePermission.createMany({ data: valid.map((permission) => ({ role, permission, updatedById: actor.id })) });
    await audit(
      actor,
      {
        action: "roles.permisos",
        entityType: "Role",
        entityId: role,
        details: { agregados: valid.filter((p) => !before.includes(p)), quitados: before.filter((p) => !(valid as string[]).includes(p)) },
      },
      tx,
    );
  });
}
