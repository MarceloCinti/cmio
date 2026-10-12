"use client";

import { Save } from "lucide-react";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { patientAdminSchema } from "@/lib/validation/patients";
import type { FormAction } from "@/lib/action-state";

export type PatientFormValues = {
  firstName?: string;
  lastName?: string;
  documentType?: string;
  documentNumber?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  insuranceProvider?: string | null;
  adminNotes?: string | null;
};

export function PatientForm({
  action,
  values = {},
  patientId,
  next,
  submitLabel,
}: {
  action: FormAction;
  values?: PatientFormValues;
  patientId?: string;
  next?: string;
  submitLabel: string;
}) {
  const v = (k: keyof PatientFormValues) => values[k] ?? "";
  return (
    <ActionForm action={action} schema={patientAdminSchema} className="space-y-6">
      {patientId ? <input type="hidden" name="patientId" value={patientId} /> : null}
      {next ? <input type="hidden" name="siguiente" value={next} /> : null}
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Identificación</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="firstName" label="Nombre" required defaultValue={v("firstName")} autoComplete="off" />
          <TextField name="lastName" label="Apellido" required defaultValue={v("lastName")} autoComplete="off" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="documentType"
            label="Tipo de documento"
            defaultValue={v("documentType") || "CI"}
            options={[
              { value: "CI", label: "Cédula de identidad" },
              { value: "PASSPORT", label: "Pasaporte" },
              { value: "OTHER", label: "Otro" },
            ]}
          />
          <TextField name="documentNumber" label="Número de documento" defaultValue={v("documentNumber")} inputMode="numeric" optionalLabel />
          <TextField name="birthDate" label="Fecha de nacimiento" type="date" defaultValue={v("birthDate")} optionalLabel />
        </div>
        <SelectField
          name="sex"
          label="Sexo"
          optionalLabel
          placeholder="Sin especificar"
          defaultValue={v("sex")}
          options={[
            { value: "FEMALE", label: "Femenino" },
            { value: "MALE", label: "Masculino" },
            { value: "OTHER", label: "Otro" },
            { value: "UNDISCLOSED", label: "Prefiere no informar" },
          ]}
          wrapperClassName="sm:max-w-xs"
        />
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Contacto</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" required defaultValue={v("phone")} />
          <TextField name="email" label="Correo electrónico" type="email" inputMode="email" optionalLabel defaultValue={v("email")} hint="Necesario para invitar al portal." />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <TextField name="city" label="Ciudad" optionalLabel defaultValue={v("city")} />
          <TextField name="address" label="Dirección" optionalLabel defaultValue={v("address")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="emergencyContactName" label="Contacto de emergencia" optionalLabel defaultValue={v("emergencyContactName")} />
          <TextField name="emergencyContactPhone" label="Teléfono de emergencia" type="tel" inputMode="tel" optionalLabel defaultValue={v("emergencyContactPhone")} />
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <legend className="px-1 text-base font-semibold text-ink">Datos administrativos</legend>
        <TextField name="insuranceProvider" label="Seguro médico o cobertura" optionalLabel defaultValue={v("insuranceProvider")} />
        <TextAreaField name="adminNotes" label="Observaciones administrativas" optionalLabel rows={3} defaultValue={v("adminNotes")} hint="Solo información administrativa. No registres datos clínicos aquí." />
      </fieldset>
      <SubmitButton size="lg" pendingLabel="Guardando…">
        <Save className="size-5" aria-hidden="true" /> {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}
