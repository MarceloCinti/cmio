"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "@/lib/validation/zod-es";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { db } from "@/server/db";
import {
  bookAppointment,
  changeAppointmentStatus,
  rescheduleAppointment,
  updateAppointmentNotes,
} from "@/server/services/appointments";
import { startEncounterForAppointment } from "@/server/services/clinical";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";

const STATUS = z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]);

const SUCCESS: Record<string, string> = {
  CONFIRMED: "Cita confirmada.",
  CHECKED_IN: "Llegada registrada. El paciente está en sala de espera.",
  IN_PROGRESS: "Consulta iniciada.",
  COMPLETED: "Consulta finalizada.",
  CANCELLED: "Cita cancelada.",
  NO_SHOW: "Ausencia registrada.",
};

export async function bookFromPanelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  let id = "";
  const input = formDataToObject(formData);
  // Para sobreturnos, el horario se arma con fecha y hora manuales.
  if (input.overbook === "on" && typeof input.overbookDate === "string" && typeof input.overbookTime === "string") {
    const { localToUtc } = await import("@/lib/time");
    const [h, m] = input.overbookTime.split(":").map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) input.startsAt = localToUtc(input.overbookDate, h * 60 + m).toISOString();
  }
  const result = await runAction(async () => {
    const appt = await bookAppointment(actor, input);
    id = appt.id;
  });
  if (result?.ok) redirect(`/panel/citas/${id}?nueva=1`);
  return result;
}

export async function changeStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const parsed = STATUS.safeParse(formData.get("to"));
  const id = String(formData.get("appointmentId") ?? "");
  if (!parsed.success || !id) return { ok: false, message: "Acción no válida.", at: Date.now() };
  const to = parsed.data;
  let encounterId: string | null = null;
  const result = await runAction(async () => {
    await changeAppointmentStatus(actor, id, to, (formData.get("reason") as string | null) ?? null);
    if (to === "IN_PROGRESS" && actor.professionalId) {
      encounterId = (await startEncounterForAppointment(actor, id)).id;
    }
    revalidatePath("/panel", "layout");
  }, SUCCESS[to] ?? `Estado actualizado a ${APPOINTMENT_STATUS_LABELS[to]}.`);
  if (result?.ok && encounterId) redirect(`/panel/consultas/${encounterId}`);
  return result;
}

export async function rescheduleFromPanelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = String(formData.get("appointmentId") ?? "");
  const result = await runAction(async () => rescheduleAppointment(actor, formDataToObject(formData)));
  if (result?.ok) redirect(`/panel/citas/${id}?reprogramada=1`);
  return result;
}

export async function updateNotesAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await updateAppointmentNotes(actor, String(formData.get("appointmentId")), String(formData.get("adminNotes") ?? ""));
    revalidatePath(`/panel/citas/${formData.get("appointmentId")}`);
  }, "Observación guardada.");
}

export type PatientOption = { id: string; label: string; detail: string };

/** Búsqueda de pacientes para el selector de la agenda (solo datos administrativos mínimos). */
export async function searchPatientsForBookingAction(q: string): Promise<PatientOption[]> {
  const actor = await requireStaff();
  if (!can(actor, "citas.gestionar")) return [];
  const query = q.trim().slice(0, 60);
  if (query.length < 2) return [];
  const digits = query.replace(/\D/g, "");
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 3);
  const items = await db.patient.findMany({
    where: {
      archivedAt: null,
      OR: [
        { AND: terms.map((t) => ({ OR: [{ firstName: { contains: t, mode: "insensitive" as const } }, { lastName: { contains: t, mode: "insensitive" as const } }] })) },
        ...(digits.length >= 3 ? [{ documentNumber: { contains: digits } }, { phone: { contains: digits.slice(-7) } }] : []),
      ],
    },
    take: 8,
    orderBy: [{ lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true },
  });
  return items.map((p) => ({
    id: p.id,
    label: `${p.lastName}, ${p.firstName}`,
    detail: [p.documentNumber ? `CI ${p.documentNumber}` : null, p.phone].filter(Boolean).join(" · "),
  }));
}
