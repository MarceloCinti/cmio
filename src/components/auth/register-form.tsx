"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { z } from "@/lib/validation/zod-es";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField, useFormCtx } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { registerSchema, registerStep1Schema } from "@/lib/validation/auth";
import type { FieldErrors } from "@/lib/action-state";
import { formDataToObject } from "@/lib/form-data";
import { registerAction } from "@/app/(auth)/actions";

const STEP1_FIELDS = Object.keys(registerStep1Schema.shape);

export function RegisterForm({ next }: { next?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Errors, setStep1Errors] = useState<FieldErrors>({});
  return (
    <ActionForm action={registerAction} schema={registerSchema} className="space-y-5" showSuccess={false}>
      {next ? <input type="hidden" name="siguiente" value={next} /> : null}
      <StepWatcher onStep1Error={() => setStep(1)} />
      <ol className="grid grid-cols-2 gap-2" aria-label="Pasos del registro">
        {["Tus datos", "Tu cuenta"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`rounded-xl border px-3 py-2 text-sm ${step === i + 1 ? "border-primary bg-primary-soft font-semibold text-primary" : "border-line text-muted"}`}
          >
            <span className="block text-xs">Paso {i + 1} de 2</span>
            {label}
          </li>
        ))}
      </ol>

      <Step1 hidden={step !== 1} errors={step1Errors} />

      <div hidden={step !== 2} className="space-y-5">
        <TextField name="email" label="Correo electrónico" type="email" inputMode="email" autoComplete="email" required hint="Te enviaremos un enlace para confirmarlo." />
        <TextField
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          hint="Al menos 10 caracteres. Puedes usar una frase fácil de recordar."
        />
        <TextField name="passwordConfirm" label="Repite la contraseña" type="password" autoComplete="new-password" required />
        <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Comunicaciones</legend>
          <CheckboxField name="emailOptIn" defaultChecked label="Quiero recibir confirmaciones y recordatorios de mis citas por correo electrónico." />
          <CheckboxField name="whatsappOptIn" label="Quiero recibir recordatorios de mis citas por WhatsApp." hint="Los mensajes solo incluyen fecha y hora, nunca información médica." />
        </fieldset>
        <CheckboxField
          name="acceptTerms"
          label={
            <>
              Leí y acepto los{" "}
              <Link href="/terminos" target="_blank" className="font-medium text-primary underline">
                términos de uso
              </Link>{" "}
              y el{" "}
              <Link href="/tratamiento-de-datos" target="_blank" className="font-medium text-primary underline">
                aviso de tratamiento de datos
              </Link>
              .
            </>
          }
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => setStep(1)} icon={<ArrowLeft className="size-4" aria-hidden="true" />}>
            Volver
          </Button>
          <SubmitButton size="lg" pendingLabel="Creando cuenta…">
            <UserPlus className="size-5" aria-hidden="true" /> Crear cuenta
          </SubmitButton>
        </div>
      </div>

      {step === 1 ? (
        <ContinueButton
          onValid={() => {
            setStep1Errors({});
            setStep(2);
          }}
          onInvalid={setStep1Errors}
        />
      ) : null}
    </ActionForm>
  );
}

function Step1({ hidden, errors }: { hidden: boolean; errors: FieldErrors }) {
  return (
    <div hidden={hidden} className="space-y-5">
      {Object.keys(errors).length ? (
        <Alert tone="error" live>
          Revisa los datos marcados para continuar.
        </Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField name="firstName" label="Nombre" autoComplete="given-name" required error={errors.firstName?.[0]} />
        <TextField name="lastName" label="Apellido" autoComplete="family-name" required error={errors.lastName?.[0]} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[0.9fr_1.1fr]">
        <SelectField
          name="documentType"
          label="Tipo de documento"
          defaultValue="CI"
          options={[
            { value: "CI", label: "Cédula de identidad" },
            { value: "PASSPORT", label: "Pasaporte" },
            { value: "OTHER", label: "Otro" },
          ]}
          required
        />
        <TextField name="documentNumber" label="Número de documento" inputMode="numeric" autoComplete="off" required error={errors.documentNumber?.[0]} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField name="birthDate" label="Fecha de nacimiento" type="date" autoComplete="bday" required error={errors.birthDate?.[0]} max={new Date().toISOString().slice(0, 10)} />
        <TextField name="phone" label="Teléfono celular" type="tel" inputMode="tel" autoComplete="tel" placeholder="0981 123 456" required error={errors.phone?.[0]} />
      </div>
    </div>
  );
}

function ContinueButton({ onValid, onInvalid }: { onValid: () => void; onInvalid: (e: FieldErrors) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <Button
      ref={ref}
      size="lg"
      className="w-full"
      onClick={() => {
        const form = ref.current?.form;
        if (!form) return;
        const data = formDataToObject(new FormData(form));
        const result = registerStep1Schema.safeParse(data);
        if (!result.success) {
          const errors = z.flattenError(result.error).fieldErrors as FieldErrors;
          onInvalid(errors);
          const first = STEP1_FIELDS.find((f) => errors[f]?.length);
          if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
          return;
        }
        onValid();
        setTimeout(() => form.querySelector<HTMLElement>('[name="email"]')?.focus(), 0);
      }}
    >
      Continuar <ArrowRight className="size-5" aria-hidden="true" />
    </Button>
  );
}

/** Si el servidor rechaza un dato del paso 1, vuelve a ese paso. */
function StepWatcher({ onStep1Error }: { onStep1Error: () => void }) {
  const { errors } = useFormCtx();
  const hasStep1Error = STEP1_FIELDS.some((f) => errors[f]?.length);
  useEffect(() => {
    if (hasStep1Error) onStep1Error();
  }, [hasStep1Error, onStep1Error]);
  return null;
}
