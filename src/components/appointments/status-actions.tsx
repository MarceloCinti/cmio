"use client";

import { CheckCircle2, DoorOpen, Play, Square, UserX, XCircle } from "lucide-react";
import { ActionButton, ConfirmAction } from "@/components/ui/confirm-action";
import type { ButtonSize } from "@/components/ui/button";
import type { AppointmentStatusKey } from "@/lib/labels";
import { changeStatusAction } from "@/app/panel/citas/actions";

type Props = {
  appointmentId: string;
  actions: AppointmentStatusKey[];
  patientName: string;
  when: string;
  size?: ButtonSize;
  /** NO_SHOW → CHECKED_IN es una corrección y requiere motivo. */
  isNoShow?: boolean;
};

export function StatusActions({ appointmentId, actions, patientName, when, size = "sm", isNoShow }: Props) {
  const fields = (to: string) => ({ appointmentId, to });
  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes("CONFIRMED") ? (
        <ActionButton action={changeStatusAction} fields={fields("CONFIRMED")} size={size} variant="subtle" icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
          Confirmar
        </ActionButton>
      ) : null}
      {actions.includes("CHECKED_IN") ? (
        isNoShow ? (
          <ConfirmAction
            action={changeStatusAction}
            fields={fields("CHECKED_IN")}
            title="Corregir ausencia"
            description={`${patientName} figuraba como ausente. Se registrará su llegada.`}
            confirmLabel="Registrar llegada"
            triggerLabel="Registrar llegada"
            triggerVariant="subtle"
            triggerSize={size}
            reasonLabel="Motivo de la corrección"
            reasonRequired
          />
        ) : (
          <ActionButton action={changeStatusAction} fields={fields("CHECKED_IN")} size={size} variant="secondary" icon={<DoorOpen className="size-4" aria-hidden="true" />}>
            Registrar llegada
          </ActionButton>
        )
      ) : null}
      {actions.includes("IN_PROGRESS") ? (
        <ActionButton action={changeStatusAction} fields={fields("IN_PROGRESS")} size={size} variant="secondary" icon={<Play className="size-4" aria-hidden="true" />}>
          Iniciar consulta
        </ActionButton>
      ) : null}
      {actions.includes("COMPLETED") ? (
        <ConfirmAction
          action={changeStatusAction}
          fields={fields("COMPLETED")}
          title="Finalizar la atención"
          description="La cita quedará como finalizada. Si registraste la consulta clínica, recuerda finalizarla también desde la historia clínica."
          confirmLabel="Finalizar"
          triggerLabel="Finalizar atención"
          triggerVariant="outline"
          triggerSize={size}
          triggerIcon={<Square className="size-4" aria-hidden="true" />}
        />
      ) : null}
      {actions.includes("NO_SHOW") ? (
        <ConfirmAction
          action={changeStatusAction}
          fields={fields("NO_SHOW")}
          title="Marcar ausencia"
          description={`Se registrará que ${patientName} no asistió a la cita del ${when}.`}
          confirmLabel="Marcar ausente"
          triggerLabel="Ausente"
          triggerVariant="outline"
          triggerSize={size}
          triggerIcon={<UserX className="size-4" aria-hidden="true" />}
        />
      ) : null}
      {actions.includes("CANCELLED") ? (
        <ConfirmAction
          action={changeStatusAction}
          fields={fields("CANCELLED")}
          title="Cancelar la cita"
          description={`Se cancelará la cita de ${patientName} del ${when}. El horario quedará disponible y se notificará al paciente. La cita se conserva en el historial.`}
          confirmLabel="Cancelar la cita"
          cancelLabel="Volver"
          triggerLabel="Cancelar"
          triggerVariant="outline"
          triggerSize={size}
          triggerIcon={<XCircle className="size-4" aria-hidden="true" />}
          destructive
          reasonLabel="Motivo de la cancelación"
          reasonRequired
        />
      ) : null}
    </div>
  );
}
