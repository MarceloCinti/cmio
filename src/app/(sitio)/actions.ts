"use server";

import { runAction } from "@/server/action";
import { getRequestMeta } from "@/server/auth/request-meta";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { submitAppointmentRequest, submitContactForm } from "@/server/services/contact-requests";

export async function sendContactAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await submitContactForm(formDataToObject(formData), await getRequestMeta());
  }, "¡Gracias! Recibimos tu mensaje y te responderemos en horario de atención.");
}

export async function sendAppointmentRequestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await submitAppointmentRequest(formDataToObject(formData), await getRequestMeta());
  }, "¡Solicitud enviada! La secretaría se comunicará contigo para coordinar el horario.");
}
