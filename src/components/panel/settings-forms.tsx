"use client";

import { Save } from "lucide-react";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import type { BookingPolicy, NotificationSettings } from "@/lib/system-settings";
import { saveSystemSettingAction } from "@/app/panel/admin-actions";

export function BookingPolicyForm({ v }: { v: BookingPolicy }) {
  return (
    <ActionForm action={saveSystemSettingAction} className="space-y-4">
      <input type="hidden" name="key" value="booking" />
      <input type="hidden" name="__booleans" value="allowPatientReschedule" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="minLeadHours" label="Anticipación mínima para reservar en línea (horas)" inputMode="numeric" defaultValue={String(v.minLeadHours)} />
        <TextField name="maxDaysAhead" label="Reservas en línea hasta (días hacia adelante)" inputMode="numeric" defaultValue={String(v.maxDaysAhead)} />
        <TextField name="patientCancelMinHours" label="El paciente puede cancelar hasta (horas antes)" inputMode="numeric" defaultValue={String(v.patientCancelMinHours)} />
        <TextField name="patientRescheduleMinHours" label="El paciente puede reprogramar hasta (horas antes)" inputMode="numeric" defaultValue={String(v.patientRescheduleMinHours)} />
        <TextField name="confirmWindowHours" label="Confirmación de asistencia desde (horas antes)" inputMode="numeric" defaultValue={String(v.confirmWindowHours)} />
        <TextField name="maxActiveAppointmentsPerPatient" label="Máximo de citas próximas por paciente (portal)" inputMode="numeric" defaultValue={String(v.maxActiveAppointmentsPerPatient)} />
      </div>
      <CheckboxField name="allowPatientReschedule" defaultChecked={v.allowPatientReschedule} label="Permitir que los pacientes reprogramen desde el portal" />
      <TextAreaField name="cancellationPolicyText" label="Texto de la política (se muestra al paciente)" rows={3} defaultValue={v.cancellationPolicyText} />
      <SubmitButton pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar políticas
      </SubmitButton>
    </ActionForm>
  );
}

export function NotificationSettingsForm({ v }: { v: NotificationSettings }) {
  return (
    <ActionForm action={saveSystemSettingAction} className="space-y-4">
      <input type="hidden" name="key" value="notifications" />
      <input type="hidden" name="__booleans" value="emailEnabled" />
      <input type="hidden" name="__booleans" value="whatsappEnabled" />
      <input type="hidden" name="__booleans" value="notifyStaffOnPortalBooking" />
      <CheckboxField name="emailEnabled" defaultChecked={v.emailEnabled} label="Enviar avisos de citas por correo electrónico" />
      <CheckboxField name="whatsappEnabled" defaultChecked={v.whatsappEnabled} label="Enviar avisos por WhatsApp (solo a pacientes que lo autorizaron)" />
      <CheckboxField name="notifyStaffOnPortalBooking" defaultChecked={v.notifyStaffOnPortalBooking} label="Avisar a la secretaría cuando un paciente agenda desde el portal" />
      <TextField name="reminderHoursBefore" label="Enviar recordatorios con (horas de anticipación)" inputMode="numeric" defaultValue={String(v.reminderHoursBefore)} wrapperClassName="sm:max-w-sm" />
      <SubmitButton pendingLabel="Guardando…">
        <Save className="size-4" aria-hidden="true" /> Guardar notificaciones
      </SubmitButton>
    </ActionForm>
  );
}
