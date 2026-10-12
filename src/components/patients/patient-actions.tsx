"use client";

import { useState, useTransition } from "react";
import { Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ActionButton } from "@/components/ui/confirm-action";
import { invitePatientAction, recordConsentAction } from "@/app/panel/pacientes/actions";

export function InvitePortalButton({ patientId, hasEmail }: { patientId: string; hasEmail: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; link?: string } | null>(null);
  if (!hasEmail) return <p className="text-sm text-muted">Registra el correo electrónico del paciente para invitarlo al portal.</p>;
  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        icon={<Send className="size-4" aria-hidden="true" />}
        onClick={() => {
          const fd = new FormData();
          fd.set("patientId", patientId);
          start(async () => {
            const res = await invitePatientAction(null, fd);
            if (res) setResult({ ok: res.ok, message: res.message ?? "", link: res.ok ? res.data?.link : undefined });
          });
        }}
      >
        Enviar invitación al portal
      </Button>
      {result ? (
        <Alert tone={result.ok ? "success" : "error"} live>
          {result.message}
          {result.link ? (
            <span className="mt-2 block space-y-2">
              <code className="block rounded bg-white/70 p-2 text-xs break-all">{result.link}</code>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold underline"
                onClick={() => navigator.clipboard?.writeText(result.link!)}
              >
                <Copy className="size-4" aria-hidden="true" /> Copiar enlace
              </button>
              <span className="block text-xs">El enlace es personal, vence en 72 horas y solo funciona una vez.</span>
            </span>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}

export function ConsentToggle({ patientId, type, granted }: { patientId: string; type: string; granted: boolean }) {
  return (
    <ActionButton action={recordConsentAction} fields={{ patientId, type, granted: String(!granted) }} size="sm" variant="ghost">
      {granted ? "Registrar retiro" : "Registrar autorización"}
    </ActionButton>
  );
}
