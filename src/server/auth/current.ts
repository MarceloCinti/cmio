import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Permission } from "@/lib/permissions";
import { buildActor, can, type Actor } from "./actor";
import { readSessionCookie } from "./cookies";
import { getRequestMeta } from "./request-meta";
import { validateSessionToken } from "./session";
import { safeNextPath } from "@/lib/safe-path";

export type CurrentActor = Actor & { sessionId: string };

/** Usuario autenticado de la solicitud actual (memorizado por solicitud). */
export const getCurrentActor = cache(async (): Promise<CurrentActor | null> => {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await validateSessionToken(token);
  if (!session) return null;
  const actor = await buildActor(session.user.id, await getRequestMeta());
  return actor ? { ...actor, sessionId: session.sessionId } : null;
});

/** Ruta actual, para volver a ella después de ingresar. Solo rutas internas. */
export async function currentPath(): Promise<string> {
  const h = await headers();
  const path = h.get("x-cmio-path") ?? "/";
  return safeNextPath(path) ?? "/";
}

export { safeNextPath };

export async function requireActor(): Promise<CurrentActor> {
  const actor = await getCurrentActor();
  if (!actor) redirect(`/ingresar?siguiente=${encodeURIComponent(await currentPath())}`);
  return actor;
}

export async function requireStaff(): Promise<CurrentActor> {
  const actor = await requireActor();
  if (actor.role === "PATIENT") redirect("/portal");
  return actor;
}

export async function requirePatient(): Promise<CurrentActor & { patientId: string }> {
  const actor = await requireActor();
  if (actor.role !== "PATIENT") redirect("/panel");
  if (!actor.patientId) redirect("/ingresar?error=perfil");
  return actor as CurrentActor & { patientId: string };
}

export async function requirePermission(permission: Permission): Promise<CurrentActor> {
  const actor = await requireStaff();
  if (!can(actor, permission)) redirect("/panel/sin-permiso");
  return actor;
}

export async function requireAnyPermission(...permissions: Permission[]): Promise<CurrentActor> {
  const actor = await requireStaff();
  if (!permissions.some((p) => can(actor, p))) redirect("/panel/sin-permiso");
  return actor;
}

export async function requireClinician(): Promise<CurrentActor & { professionalId: string }> {
  const actor = await requireStaff();
  if (!actor.professionalId) redirect("/panel/sin-permiso");
  return actor as CurrentActor & { professionalId: string };
}
