"use client";

import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField, type Option } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { appointmentRequestSchema } from "@/lib/validation/public-forms";
import { sendAppointmentRequestAction } from "@/app/(sitio)/actions";

export function AppointmentRequestForm({ specialties, defaultSpecialtyId }: { specialties: Option[]; defaultSpecialtyId?: string }) {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <Alert tone="success" title="¡Solicitud enviada!" live>
        La secretaría se comunicará contigo para coordinar el horario. Si es urgente, llámanos por teléfono.{" "}
        <button type="button" className="font-semibold underline" onClick={() => setSent(false)}>
          Enviar otra solicitud
        </button>
      </Alert>
    );
  }
  return (
    <ActionForm action={sendAppointmentRequestAction} schema={appointmentRequestSchema} showSuccess={false} onSuccess={() => setSent(true)} className="space-y-4">
      <TextField name="fullName" label="Nombre y apellido" autoComplete="name" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" placeholder="0981 123 456" required />
        <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="email" optionalLabel />
      </div>
      <SelectField name="specialtyId" label="Especialidad" options={specialties} placeholder="No estoy seguro / otra" defaultValue={defaultSpecialtyId ?? ""} optionalLabel />
      <TextField name="preferredSchedule" label="Días u horarios preferidos" placeholder="Por ejemplo: martes o jueves por la tarde" optionalLabel />
      <TextAreaField name="message" label="Comentario para la secretaría" rows={3} maxLength={600} optionalLabel hint="No incluyas información médica sensible." />
      <div className="hidden" aria-hidden="true">
        <label>
          No completar este campo
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <CheckboxField
        name="consent"
        label={
          <>
            Acepto el{" "}
            <Link href="/tratamiento-de-datos" className="font-medium text-primary underline" target="_blank">
              aviso de tratamiento de datos personales
            </Link>
            .
          </>
        }
      />
      <SubmitButton className="w-full" size="lg" pendingLabel="Enviando…">
        <Send className="size-4" aria-hidden="true" /> Enviar solicitud
      </SubmitButton>
    </ActionForm>
  );
}
