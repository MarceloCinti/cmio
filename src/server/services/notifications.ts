import "server-only";
import { db } from "@/server/db";
import type { Permission } from "@/lib/permissions";
import { NotFoundError } from "@/server/errors";
import type { Actor } from "@/server/auth/actor";

type NotificationInput = { title: string; body: string; href?: string };

// Las notificaciones internas nunca incluyen información clínica.

export async function notifyUser(userId: string, input: NotificationInput) {
  await db.notification.create({ data: { userId, title: input.title, body: input.body, href: input.href ?? null } });
}

/** Notifica a todos los usuarios activos del personal que tengan el permiso indicado. */
export async function notifyStaff(permission: Permission, input: NotificationInput) {
  const roles = await db.rolePermission.findMany({ where: { permission }, select: { role: true } });
  const roleList = Array.from(new Set(["OWNER", ...roles.map((r) => r.role)])) as ("OWNER" | "ADMIN" | "SECRETARY" | "DOCTOR")[];
  const users = await db.user.findMany({ where: { role: { in: roleList }, status: "ACTIVE" }, select: { id: true } });
  if (!users.length) return;
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title: input.title, body: input.body, href: input.href ?? null })),
  });
}

export async function listNotifications(actor: Actor, limit = 30) {
  return db.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: limit });
}

export async function unreadNotificationCount(actor: Actor) {
  return db.notification.count({ where: { userId: actor.id, readAt: null } });
}

export async function markNotificationRead(actor: Actor, id: string) {
  const n = await db.notification.findFirst({ where: { id, userId: actor.id } });
  if (!n) throw new NotFoundError("La notificación no existe.");
  if (!n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(actor: Actor) {
  await db.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } });
}
