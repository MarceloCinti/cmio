"use client";

import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { updateRequestAction } from "@/app/panel/admin-actions";

export function RequestStatusForm({ id, status, note }: { id: string; status: string; note: string }) {
  return (
    <ActionForm action={updateRequestAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
      <input type="hidden" name="id" value={id} />
      <SelectField
        name="status"
        label="Estado"
        defaultValue={status}
        options={[
          { value: "NEW", label: "Nueva" },
          { value: "IN_PROGRESS", label: "En gestión" },
          { value: "RESOLVED", label: "Resuelta" },
          { value: "DISCARDED", label: "Descartada" },
        ]}
      />
      <TextField name="internalNote" label="Nota interna" defaultValue={note} placeholder="Ej.: se agendó para el martes" maxLength={500} />
      <SubmitButton variant="outline" pendingLabel="Guardando…">
        Guardar
      </SubmitButton>
    </ActionForm>
  );
}
