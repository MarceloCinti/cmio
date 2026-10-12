"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/server/auth/current";
import { createPatientRecord, invitePatientToPortal, recordConsent, updatePatientAdmin } from "@/server/services/patients";

export async function createPatientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  let id = "";
  const next = String(formData.get("siguiente") ?? "");
  const result = await runAction(async () => {
    id = (await createPatientRecord(actor, formDataToObject(formData))).id;
  });
  if (result?.ok) redirect(next === "agendar" ? `/panel/citas/nueva?paciente=${id}` : `/panel/pacientes/${id}?nuevo=1`);
  return result;
}

export async function updatePatientAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  return runAction(async () => {
    await updatePatientAdmin(actor, id, formDataToObject(formData));
    revalidatePath(`/panel/pacientes/${id}`);
  }, "Datos del paciente actualizados.");
}

export async function invitePatientAction(_: ActionState, formData: FormData): Promise<ActionState<{ link?: string }>> {
  const actor = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  let link: string | undefined;
  let sent = false;
  const result = await runAction(async () => {
    const res = await invitePatientToPortal(actor, id);
    link = res.link;
    sent = res.sent;
    revalidatePath(`/panel/pacientes/${id}`);
    return { link };
  });
  if (result?.ok) {
    return {
      ok: true,
      at: Date.now(),
      data: { link },
      message: sent
        ? link
          ? "Invitación generada (modo de desarrollo: el correo se guardó localmente)."
          : "Invitación enviada por correo electrónico."
        : "No hay envío de correos configurado. Comparte el enlace de invitación de forma segura con el paciente.",
    };
  }
  return result;
}

export async function recordConsentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = String(formData.get("patientId") ?? "");
  const type = String(formData.get("type") ?? "");
  const granted = formData.get("granted") === "true";
  return runAction(async () => {
    if (!["EMAIL_NOTIFICATIONS", "WHATSAPP_NOTIFICATIONS"].includes(type)) throw new Error("Tipo inválido");
    await recordConsent(actor, id, type as "EMAIL_NOTIFICATIONS", granted);
    revalidatePath(`/panel/pacientes/${id}`);
  }, "Preferencia de comunicación registrada.");
}
