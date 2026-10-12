"use client";

import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { updateNotesAction } from "@/app/panel/citas/actions";

export function NotesForm({ appointmentId, defaultValue }: { appointmentId: string; defaultValue: string }) {
  return (
    <ActionForm action={updateNotesAction} className="space-y-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <TextAreaField name="adminNotes" label="Observaciones" rows={3} maxLength={500} defaultValue={defaultValue} hint="No registres información clínica en este campo." />
      <SubmitButton variant="outline" size="sm" pendingLabel="Guardando…">
        Guardar observación
      </SubmitButton>
    </ActionForm>
  );
}
