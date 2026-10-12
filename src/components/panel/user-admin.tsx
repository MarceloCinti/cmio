"use client";

import { useActionState, useState, useTransition } from "react";
import { Copy, Send, UserPlus } from "lucide-react";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ROLE_LABELS, type RoleKey } from "@/lib/permissions";
import type { ActionState } from "@/lib/action-state";
import { changeRoleAction, inviteUserAction, resendInvitationAction, setUserActiveAction, unlockUserAction } from "@/app/panel/admin-actions";

function LinkBox({ link }: { link: string }) {
  return (
    <span className="mt-2 block space-y-2">
      <code className="block rounded bg-white/70 p-2 text-xs break-all">{link}</code>
      <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold underline" onClick={() => navigator.clipboard?.writeText(link)}>
        <Copy className="size-4" aria-hidden="true" /> Copiar enlace
      </button>
      <span className="block text-xs">Enlace personal, de un solo uso, válido por 72 horas. Compártelo por un canal seguro.</span>
    </span>
  );
}

export function InviteUserForm({ roles, professionals }: { roles: RoleKey[]; professionals: { id: string; label: string }[] }) {
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <ActionForm
        action={inviteUserAction}
        resetOnSuccess
        onSuccess={(s) => setLink((s.data as { link?: string } | undefined)?.link ?? null)}
        className="space-y-4"
      >
        <TextField name="name" label="Nombre y apellido" required />
        <TextField name="email" label="Correo electrónico" type="email" required />
        <SelectField name="role" label="Rol" options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <SelectField name="professionalId" label="Vincular a un perfil profesional" placeholder="Ninguno" options={professionals.map((p) => ({ value: p.id, label: p.label }))} hint="Para profesionales de la salud: habilita su agenda y la historia clínica." />
        <SubmitButton pendingLabel="Invitando…">
          <UserPlus className="size-4" aria-hidden="true" /> Crear e invitar
        </SubmitButton>
      </ActionForm>
      {link ? (
        <Alert tone="info" title="Enlace de invitación">
          <LinkBox link={link} />
        </Alert>
      ) : null}
    </div>
  );
}

export function UserRowActions({
  id,
  name,
  role,
  status,
  locked,
  assignableRoles,
}: {
  id: string;
  name: string;
  role: RoleKey;
  status: string;
  locked: boolean;
  assignableRoles: RoleKey[];
}) {
  const [state, resend] = useActionState<ActionState<{ link?: string }>, FormData>(resendInvitationAction, null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {assignableRoles.length ? (
        <ActionForm action={changeRoleAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="sr-only" htmlFor={`role-${id}`}>
            Rol de {name}
          </label>
          <select id={`role-${id}`} name="role" defaultValue={role} className="min-h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm">
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <SubmitButton size="sm" variant="outline" pendingLabel="Guardando…">
            Cambiar rol
          </SubmitButton>
        </ActionForm>
      ) : null}
      {status === "INVITED" ? (
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          icon={<Send className="size-4" aria-hidden="true" />}
          onClick={() => {
            const fd = new FormData();
            fd.set("id", id);
            start(() => resend(fd));
          }}
        >
          Reenviar invitación
        </Button>
      ) : null}
      {locked ? (
        <ConfirmAction action={unlockUserAction} fields={{ id }} title="Desbloquear cuenta" description={`Se quitará el bloqueo por intentos fallidos de ${name}.`} confirmLabel="Desbloquear" triggerLabel="Desbloquear" />
      ) : null}
      {status === "DISABLED" ? (
        <ConfirmAction action={setUserActiveAction} fields={{ id, active: "true" }} title="Reactivar cuenta" description={`${name} podrá volver a ingresar.`} confirmLabel="Reactivar" triggerLabel="Reactivar" />
      ) : (
        <ConfirmAction
          action={setUserActiveAction}
          fields={{ id, active: "false" }}
          title="Desactivar cuenta"
          description={`${name} no podrá ingresar y se cerrarán sus sesiones abiertas. Sus registros se conservan.`}
          confirmLabel="Desactivar"
          triggerLabel="Desactivar"
          destructive
        />
      )}
      {state ? (
        <div className="w-full">
          <Alert tone={state.ok ? "success" : "error"}>
            {state.message}
            {state.ok && state.data?.link ? <LinkBox link={state.data.link} /> : null}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
