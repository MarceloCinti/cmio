"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireActor } from "@/server/auth/current";
import { changePassword } from "@/server/services/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/server/services/notifications";

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireActor();
  return runAction(async () => changePassword(actor, formDataToObject(formData)), "Tu contraseña fue actualizada.");
}

export async function markAllReadAction(_?: ActionState, __?: FormData): Promise<ActionState> {
  const actor = await requireActor();
  return runAction(async () => {
    await markAllNotificationsRead(actor);
    revalidatePath("/", "layout");
  }, "Notificaciones marcadas como leídas.");
}

export async function markReadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireActor();
  return runAction(async () => {
    await markNotificationRead(actor, String(formData.get("id") ?? ""));
    revalidatePath("/", "layout");
  });
}
