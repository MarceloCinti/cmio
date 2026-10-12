"use client";

import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { contactFormSchema } from "@/lib/validation/public-forms";
import { sendContactAction } from "@/app/(sitio)/actions";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <Alert tone="success" title="¡Mensaje enviado!" live>
        Recibimos tu mensaje y te responderemos en horario de atención.{" "}
        <button type="button" className="font-semibold underline" onClick={() => setSent(false)}>
          Enviar otro mensaje
        </button>
      </Alert>
    );
  }
  return (
    <ActionForm action={sendContactAction} schema={contactFormSchema} showSuccess={false} onSuccess={() => setSent(true)} className="space-y-4">
      <TextField name="fullName" label="Nombre y apellido" autoComplete="name" required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" placeholder="0981 123 456" required />
        <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="email" optionalLabel />
      </div>
      <TextAreaField name="message" label="¿En qué podemos ayudarte?" rows={4} maxLength={1000} required />
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
      <SubmitButton className="w-full sm:w-auto" pendingLabel="Enviando…">
        <Send className="size-4" aria-hidden="true" /> Enviar mensaje
      </SubmitButton>
    </ActionForm>
  );
}
