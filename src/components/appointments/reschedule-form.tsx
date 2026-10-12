"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { SlotPicker } from "@/components/scheduling/slot-picker";
import type { FormAction } from "@/lib/action-state";
import { formatLongDateTime } from "@/lib/format";

export function RescheduleForm({
  action,
  appointmentId,
  professionalId,
  serviceId,
  staff,
}: {
  action: FormAction;
  appointmentId: string;
  professionalId: string;
  serviceId: string;
  staff?: boolean;
}) {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  return (
    <ActionForm action={action} className="space-y-5">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="startsAt" value={startsAt ?? ""} />
      <SlotPicker professionalId={professionalId} serviceId={serviceId} value={startsAt} onChange={setStartsAt} excludeAppointmentId={appointmentId} showTaken={staff} />
      {staff ? <TextField name="reason" label="Motivo de la reprogramación" optionalLabel maxLength={300} /> : null}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink" aria-live="polite">
          {startsAt ? (
            <>
              Nuevo horario: <strong className="first-letter:uppercase">{formatLongDateTime(startsAt)}</strong>
            </>
          ) : (
            "Elige un nuevo horario disponible."
          )}
        </p>
        <SubmitButton pendingLabel="Guardando…">
          <CalendarCheck className="size-4" aria-hidden="true" /> Confirmar nuevo horario
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
