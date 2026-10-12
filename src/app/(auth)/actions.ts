"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { getRequestMeta } from "@/server/auth/request-meta";
import { clearSessionCookie, setSessionCookie } from "@/server/auth/cookies";
import { getCurrentActor, safeNextPath } from "@/server/auth/current";
import {
  acceptInvitation,
  login,
  logout,
  registerPatient,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "@/server/services/auth";

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const input = formDataToObject(formData);
  let destination = "/";
  const result = await runAction(async () => {
    const res = await login(input, await getRequestMeta());
    await setSessionCookie(res.token, res.expiresAt);
    const next = safeNextPath(typeof input.siguiente === "string" ? input.siguiente : null);
    const home = res.role === "PATIENT" ? "/portal" : "/panel";
    // Un paciente no puede ser enviado al panel ni el personal al portal.
    destination = next && (res.role === "PATIENT" ? !next.startsWith("/panel") : !next.startsWith("/portal")) ? next : home;
  });
  if (result?.ok) redirect(destination);
  return result;
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const input = formDataToObject(formData);
  let email = "";
  const result = await runAction(async () => {
    const res = await registerPatient(input, await getRequestMeta());
    email = res.email;
  });
  if (result?.ok) redirect(`/registro/listo?correo=${encodeURIComponent(email)}`);
  return result;
}

export async function verifyEmailAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const result = await runAction(async () => verifyEmail(token, await getRequestMeta()));
  if (result?.ok) redirect("/ingresar?verificado=1");
  return result;
}

export async function resendVerificationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(
    async () => resendVerification(formDataToObject(formData), await getRequestMeta()),
    "Si el correo corresponde a una cuenta pendiente de confirmación, te enviamos un nuevo enlace.",
  );
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(
    async () => requestPasswordReset(formDataToObject(formData), await getRequestMeta()),
    "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.",
  );
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => resetPassword(formDataToObject(formData), await getRequestMeta()));
  if (result?.ok) redirect("/ingresar?restablecida=1");
  return result;
}

export async function acceptInvitationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => acceptInvitation(formDataToObject(formData), await getRequestMeta()));
  if (result?.ok) redirect("/ingresar?activada=1");
  return result;
}

export async function logoutAction() {
  const actor = await getCurrentActor();
  if (actor) await logout(actor);
  await clearSessionCookie();
  redirect("/ingresar?salida=1");
}
