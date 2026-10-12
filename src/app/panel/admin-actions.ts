"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/server/auth/current";
import { ValidationError } from "@/server/errors";
import { CONFIGURABLE_ROLES, ROLES, type ConfigurableRole, type RoleKey } from "@/lib/permissions";
import { SITE_CONTENT_KEYS, type SiteContentKey } from "@/lib/site-content";
import { SYSTEM_SETTING_SCHEMAS, type SystemSettingKey } from "@/lib/system-settings";
import { deleteFaq, deleteService, deleteSpecialty, saveFaq, saveProfessional, saveService, saveSpecialty, uploadPublicImage } from "@/server/services/catalog";
import { updateContactRequest } from "@/server/services/contact-requests";
import { changeUserRole, inviteStaffUser, resendInvitation, setRolePermissions, setUserActive, unlockUser } from "@/server/services/users";
import { discardContentDraft, publishContent, saveContentDraft, updateSystemSetting } from "@/server/services/settings";
import { retryOutboundMessage, updateTemplate } from "@/server/services/messages-admin";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ── Catálogo ─────────────────────────────────────────────────

export async function saveSpecialtyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await saveSpecialty(actor, str(fd, "id") || null, formDataToObject(fd));
    revalidatePath("/", "layout");
  }, "Especialidad guardada.");
}

export async function deleteSpecialtyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteSpecialty(actor, str(fd, "id"));
    revalidatePath("/", "layout");
  }, "Especialidad eliminada.");
}

export async function saveServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await saveService(actor, str(fd, "id") || null, formDataToObject(fd));
    revalidatePath("/", "layout");
  }, "Servicio guardado.");
}

export async function deleteServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteService(actor, str(fd, "id"));
    revalidatePath("/", "layout");
  }, "Servicio eliminado.");
}

export async function saveProfessionalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const existing = str(fd, "id") || null;
  let id = "";
  const result = await runAction(async () => {
    id = await saveProfessional(actor, existing, formDataToObject(fd));
    revalidatePath("/", "layout");
  }, "Perfil profesional guardado.");
  if (result?.ok && !existing) redirect(`/panel/profesionales/${id}?nuevo=1`);
  return result;
}

export async function uploadImageAction(_: ActionState<{ path: string }>, fd: FormData): Promise<ActionState<{ path: string }>> {
  const actor = await requireStaff();
  return runAction(async () => ({ path: await uploadPublicImage(actor, fd.get("file") as File | null) }), "Imagen subida.");
}

export async function saveFaqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await saveFaq(actor, str(fd, "id") || null, formDataToObject(fd));
    revalidatePath("/", "layout");
  }, "Pregunta guardada.");
}

export async function deleteFaqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteFaq(actor, str(fd, "id"));
    revalidatePath("/", "layout");
  }, "Pregunta eliminada.");
}

// ── Solicitudes del sitio ───────────────────────────────────

export async function updateRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const status = str(fd, "status");
  return runAction(async () => {
    if (!["NEW", "IN_PROGRESS", "RESOLVED", "DISCARDED"].includes(status)) throw new ValidationError("Estado inválido.");
    await updateContactRequest(actor, str(fd, "id"), { status: status as "NEW", internalNote: str(fd, "internalNote") || null });
    revalidatePath("/panel", "layout");
  }, "Solicitud actualizada.");
}

// ── Usuarios y roles ────────────────────────────────────────

export async function inviteUserAction(_: ActionState<{ link?: string }>, fd: FormData): Promise<ActionState<{ link?: string }>> {
  const actor = await requireStaff();
  let res: { sent: boolean; link?: string } = { sent: false };
  const result = await runAction(async () => {
    res = await inviteStaffUser(actor, formDataToObject(fd));
    revalidatePath("/panel/usuarios");
  });
  if (!result?.ok) return result;
  return {
    ok: true,
    at: Date.now(),
    data: { link: res.link },
    message: res.link
      ? "Usuario creado. No hay envío de correos por SMTP configurado: comparte el enlace de invitación de forma segura."
      : "Invitación enviada por correo electrónico.",
  };
}

export async function resendInvitationAction(_: ActionState<{ link?: string }>, fd: FormData): Promise<ActionState<{ link?: string }>> {
  const actor = await requireStaff();
  let res: { sent: boolean; link?: string } = { sent: false };
  const result = await runAction(async () => {
    res = await resendInvitation(actor, str(fd, "id"));
  });
  if (!result?.ok) return result;
  return { ok: true, at: Date.now(), data: { link: res.link }, message: res.link ? "Nuevo enlace de invitación generado." : "Invitación reenviada." };
}

export async function changeRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const role = str(fd, "role");
  return runAction(async () => {
    if (!(ROLES as readonly string[]).includes(role)) throw new ValidationError("Rol inválido.");
    await changeUserRole(actor, str(fd, "id"), role as RoleKey);
    revalidatePath("/panel/usuarios");
  }, "Rol actualizado. La persona deberá ingresar nuevamente.");
}

export async function setUserActiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const active = str(fd, "active") === "true";
  return runAction(async () => {
    await setUserActive(actor, str(fd, "id"), active);
    revalidatePath("/panel/usuarios");
  }, active ? "Cuenta reactivada." : "Cuenta desactivada y sesiones cerradas.");
}

export async function unlockUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await unlockUser(actor, str(fd, "id"));
    revalidatePath("/panel/usuarios");
  }, "Cuenta desbloqueada.");
}

export async function saveRolePermissionsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const role = str(fd, "role");
  return runAction(async () => {
    if (!(CONFIGURABLE_ROLES as readonly string[]).includes(role)) throw new ValidationError("Rol inválido.");
    await setRolePermissions(actor, role as ConfigurableRole, fd.getAll("permissions[]").map(String));
    revalidatePath("/panel", "layout");
  }, "Permisos actualizados.");
}

// ── Configuración y contenido ───────────────────────────────

export async function saveSystemSettingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const key = str(fd, "key") as SystemSettingKey;
  return runAction(async () => {
    if (!(key in SYSTEM_SETTING_SCHEMAS)) throw new ValidationError("Configuración inválida.");
    const obj = formDataToObject(fd) as Record<string, unknown>;
    delete obj.key;
    // Casillas no marcadas no se envían en el formulario.
    for (const b of fd.getAll("__booleans").map(String)) obj[b] = obj[b] === "on";
    delete obj.__booleans;
    await updateSystemSetting(actor, key, obj);
    revalidatePath("/", "layout");
  }, "Configuración guardada.");
}

export async function saveContentDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const key = str(fd, "key") as SiteContentKey;
  return runAction(async () => {
    if (!SITE_CONTENT_KEYS.includes(key)) throw new ValidationError("Sección inválida.");
    let value: unknown;
    try {
      value = JSON.parse(str(fd, "payload"));
    } catch {
      throw new ValidationError("No se pudo leer el contenido del formulario.");
    }
    await saveContentDraft(actor, key, value);
    revalidatePath("/panel/contenido");
    revalidatePath("/vista-previa");
  }, "Borrador guardado. Revisa la vista previa y publica cuando esté listo.");
}

export async function publishContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  let published: string[] = [];
  const result = await runAction(async () => {
    published = await publishContent(actor);
    revalidatePath("/", "layout");
  });
  if (result?.ok) return { ...result, message: published.length ? "Cambios publicados en el sitio." : "No había cambios pendientes de publicar." };
  return result;
}

export async function discardDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const key = str(fd, "key") as SiteContentKey;
  return runAction(async () => {
    if (!SITE_CONTENT_KEYS.includes(key)) throw new ValidationError("Sección inválida.");
    await discardContentDraft(actor, key);
    revalidatePath("/panel/contenido");
  }, "Borrador descartado.");
}

// ── Mensajes ─────────────────────────────────────────────────

export async function retryMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await retryOutboundMessage(actor, str(fd, "id"));
    revalidatePath("/panel/mensajes");
  }, "Mensaje reenviado a la cola.");
}

export async function updateTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await updateTemplate(actor, str(fd, "id"), formDataToObject(fd));
    revalidatePath("/panel/mensajes");
  }, "Plantilla guardada.");
}
