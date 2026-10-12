"use client";

import { Upload } from "lucide-react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField, FieldShell, inputClasses } from "@/components/ui/form";
import { documentUploadSchema } from "@/lib/validation/clinical";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { uploadDocumentAction } from "@/app/panel/consultas/actions";

export function UploadDocumentForm({ patientId, encounterId, canPublish }: { patientId: string; encounterId?: string; canPublish: boolean }) {
  return (
    <ActionForm action={uploadDocumentAction} schema={documentUploadSchema.omit({ encounterId: true })} resetOnSuccess className="space-y-4" encType="multipart/form-data">
      <input type="hidden" name="patientId" value={patientId} />
      {encounterId ? <input type="hidden" name="encounterId" value={encounterId} /> : null}
      <FieldShell id="file-input" label="Archivo (PDF, JPG o PNG, máx. 10 MB)" required>
        <input id="file-input" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className={`${inputClasses} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary`} />
      </FieldShell>
      <TextField name="title" label="Título" required placeholder="Ej.: Resultado de laboratorio" />
      <SelectField name="category" label="Categoría" options={Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
      <TextAreaField name="description" label="Descripción" optionalLabel rows={2} />
      {canPublish ? (
        <CheckboxField name="publishNow" label="Revisado: publicar ahora en el portal del paciente" hint="Solo publica documentos que revisaste y que el paciente puede ver." />
      ) : (
        <p className="text-xs text-muted">El documento quedará pendiente de revisión hasta que un profesional responsable autorice su publicación.</p>
      )}
      <SubmitButton pendingLabel="Subiendo…">
        <Upload className="size-4" aria-hidden="true" /> Subir documento
      </SubmitButton>
    </ActionForm>
  );
}
