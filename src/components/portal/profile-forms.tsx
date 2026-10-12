"use client";

import { Save } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/ui/form";
import { consentPrefsSchema, patientSelfSchema } from "@/lib/validation/patients";
import { updateMyConsentsAction, updateMyProfileAction } from "@/app/portal/actions";

type Values = { phone: string; city: string; address: string; emergencyContactName: string; emergencyContactPhone: string; insuranceProvider: string };

export function ProfileForms({ values, emailOptIn, whatsappOptIn }: { values: Values; emailOptIn: boolean; whatsappOptIn: boolean }) {
  return (
    <>
      <Card>
        <CardHeader title="Datos de contacto" />
        <CardBody>
          <ActionForm action={updateMyProfileAction} schema={patientSelfSchema} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="phone" label="Teléfono celular" type="tel" inputMode="tel" required defaultValue={values.phone} />
              <TextField name="city" label="Ciudad" optionalLabel defaultValue={values.city} />
            </div>
            <TextField name="address" label="Dirección" optionalLabel defaultValue={values.address} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="emergencyContactName" label="Contacto de emergencia" optionalLabel defaultValue={values.emergencyContactName} />
              <TextField name="emergencyContactPhone" label="Teléfono de emergencia" type="tel" inputMode="tel" optionalLabel defaultValue={values.emergencyContactPhone} />
            </div>
            <TextField name="insuranceProvider" label="Seguro médico o cobertura" optionalLabel defaultValue={values.insuranceProvider} />
            <SubmitButton pendingLabel="Guardando…">
              <Save className="size-4" aria-hidden="true" /> Guardar datos
            </SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Comunicaciones" description="Los mensajes solo incluyen fecha, hora y lugar de tus citas; nunca información médica." />
        <CardBody>
          <ActionForm action={updateMyConsentsAction} schema={consentPrefsSchema} className="space-y-4">
            <CheckboxField name="emailOptIn" defaultChecked={emailOptIn} label="Recibir confirmaciones y recordatorios de citas por correo electrónico" />
            <CheckboxField name="whatsappOptIn" defaultChecked={whatsappOptIn} label="Recibir recordatorios de citas por WhatsApp" />
            <SubmitButton variant="outline" pendingLabel="Guardando…">
              Guardar preferencias
            </SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
