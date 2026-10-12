"use client";

import { Save } from "lucide-react";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { updateTemplateAction } from "@/app/panel/admin-actions";

export function TemplateForm({ t }: { t: { id: string; channel: string; subject: string | null; body: string; whatsappTemplateName: string | null; isActive: boolean } }) {
  return (
    <ActionForm action={updateTemplateAction} className="space-y-3">
      <input type="hidden" name="id" value={t.id} />
      {t.channel === "EMAIL" ? <TextField name="subject" label="Asunto" defaultValue={t.subject ?? ""} /> : null}
      <TextAreaField name="body" label="Texto" rows={t.channel === "EMAIL" ? 6 : 3} defaultValue={t.body} hint="Sin información clínica. Variables disponibles abajo." />
      {t.channel === "WHATSAPP" ? (
        <TextField name="whatsappTemplateName" label="Nombre de la plantilla aprobada en Meta" defaultValue={t.whatsappTemplateName ?? ""} hint="El texto real que recibe el paciente es el aprobado en Meta; este texto es de referencia." />
      ) : null}
      <CheckboxField name="isActive" defaultChecked={t.isActive} label="Plantilla activa" />
      <SubmitButton size="sm" variant="outline" pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar plantilla
      </SubmitButton>
    </ActionForm>
  );
}
