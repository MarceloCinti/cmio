"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ActionButton } from "@/components/ui/confirm-action";
import { invitePatientAction, recordConsentAction } from "@/app/panel/pacientes/actions";

export function InvitePortalButton({ patientId, hasEmail }: { patientId: string; hasEmail: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
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
            if (res) setResult({ ok: res.ok, message: res.message ?? "" });
          });
        }}
      >
        Enviar invitación al portal
      </Button>
      {result ? (
        <Alert tone={result.ok ? "success" : "error"} live>
          {result.message}
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
