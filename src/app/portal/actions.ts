"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requirePatient } from "@/server/auth/current";
import { bookAppointment, changeAppointmentStatus, rescheduleAppointment } from "@/server/services/appointments";
import { updateMyConsents, updateMyProfile } from "@/server/services/patients";

export async function bookFromPortalAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  let id = "";
  const result = await runAction(async () => {
    const appt = await bookAppointment(actor, formDataToObject(formData));
    id = appt.id;
  });
  if (result?.ok) redirect(`/portal/citas/${id}?nueva=1`);
  return result;
}

export async function confirmMyAppointmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  return runAction(async () => {
    await changeAppointmentStatus(actor, String(formData.get("appointmentId")), "CONFIRMED");
    revalidatePath("/portal", "layout");
  }, "¡Gracias! Confirmaste tu asistencia.");
}

export async function cancelMyAppointmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  return runAction(async () => {
    const reason = String(formData.get("reason") ?? "").trim();
    await changeAppointmentStatus(actor, String(formData.get("appointmentId")), "CANCELLED", reason || null);
    revalidatePath("/portal", "layout");
  }, "Tu cita fue cancelada.");
}

export async function rescheduleMyAppointmentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const result = await runAction(async () => rescheduleAppointment(actor, formDataToObject(formData)));
  if (result?.ok) redirect(`/portal/citas/${appointmentId}?reprogramada=1`);
  return result;
}

export async function updateMyProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  return runAction(async () => {
    await updateMyProfile(actor, formDataToObject(formData));
    revalidatePath("/portal/perfil");
  }, "Tus datos fueron actualizados.");
}

export async function updateMyConsentsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePatient();
  return runAction(async () => {
    await updateMyConsents(actor, formDataToObject(formData));
    revalidatePath("/portal/perfil");
  }, "Tus preferencias de comunicación fueron guardadas.");
}
