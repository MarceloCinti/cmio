"use client";

import { KeyRound } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { changePasswordSchema } from "@/lib/validation/auth";
import { changePasswordAction } from "@/actions/account";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} schema={changePasswordSchema} resetOnSuccess className="max-w-md space-y-4">
      <TextField name="currentPassword" label="Contraseña actual" type="password" autoComplete="current-password" required />
      <TextField name="password" label="Nueva contraseña" type="password" autoComplete="new-password" required hint="Al menos 10 caracteres." />
      <TextField name="passwordConfirm" label="Repite la nueva contraseña" type="password" autoComplete="new-password" required />
      <SubmitButton variant="outline" pendingLabel="Guardando…">
        <KeyRound className="size-4" aria-hidden="true" /> Cambiar contraseña
      </SubmitButton>
    </ActionForm>
  );
}
