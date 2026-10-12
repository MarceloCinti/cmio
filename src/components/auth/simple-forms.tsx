"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { forgotPasswordSchema, resetPasswordSchema, tokenSchema } from "@/lib/validation/auth";
import {
  acceptInvitationAction,
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
  return (
    <ActionForm action={resendVerificationAction} schema={forgotPasswordSchema} className="space-y-4">
      <TextField name="email" label="Correo electrónico" type="email" inputMode="email" defaultValue={defaultEmail} required />
      <SubmitButton variant="outline" pendingLabel="Enviando…">
        <Mail className="size-4" aria-hidden="true" /> Enviar un nuevo enlace
      </SubmitButton>
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return (
      <Alert tone="success" title="Revisa tu correo" live>
        {done}
      </Alert>
    );
  }
  return (
    <ActionForm
      action={forgotPasswordAction}
      schema={forgotPasswordSchema}
      className="space-y-5"
      showSuccess={false}
      onSuccess={(s) => setDone(s.message ?? "Te enviamos las instrucciones.")}
    >
      <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="email" required autoFocus />
      <SubmitButton className="w-full" size="lg" pendingLabel="Enviando…">
        <Mail className="size-5" aria-hidden="true" /> Enviar instrucciones
      </SubmitButton>
    </ActionForm>
  );
}

export function NewPasswordForm({ token, mode }: { token: string; mode: "reset" | "invitation" }) {
  return (
    <ActionForm action={mode === "reset" ? resetPasswordAction : acceptInvitationAction} schema={resetPasswordSchema} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <TextField
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        autoFocus
        hint="Al menos 10 caracteres. Puedes usar una frase fácil de recordar."
      />
      <TextField name="passwordConfirm" label="Repite la contraseña" type="password" autoComplete="new-password" required />
      <SubmitButton className="w-full" size="lg" pendingLabel="Guardando…">
        <KeyRound className="size-5" aria-hidden="true" /> {mode === "reset" ? "Guardar nueva contraseña" : "Activar mi cuenta"}
      </SubmitButton>
    </ActionForm>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  return (
    <ActionForm action={verifyEmailAction} schema={tokenSchema} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="w-full" size="lg" pendingLabel="Confirmando…">
        <CheckCircle2 className="size-5" aria-hidden="true" /> Confirmar mi correo
      </SubmitButton>
    </ActionForm>
  );
}
