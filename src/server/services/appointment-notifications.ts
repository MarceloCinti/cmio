import "server-only";
import { db } from "@/server/db";
import type { ConsentType, MessageEvent } from "@/generated/prisma/client";
import { formatLongDate, formatTime } from "@/lib/format";
import { appointmentVars, kickMessageQueue, queueMessage } from "./messaging";
import { notifyUser } from "./notifications";
import { getSystemSetting } from "./settings";
import { safeErrorSummary } from "@/server/errors";

const IN_APP_TITLES: Partial<Record<MessageEvent, string>> = {
  APPOINTMENT_BOOKED: "Cita agendada",
  APPOINTMENT_CONFIRMED: "Cita confirmada",
  APPOINTMENT_RESCHEDULED: "Cita reprogramada",
  APPOINTMENT_CANCELLED: "Cita cancelada",
  APPOINTMENT_REMINDER: "Recordatorio de cita",
};

/** Último consentimiento registrado por tipo (null si nunca se registró). */
export async function latestConsents(patientId: string): Promise<Record<ConsentType, boolean | null>> {
  const rows = await db.consent.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } });
  const out: Record<ConsentType, boolean | null> = { DATA_PROCESSING: null, EMAIL_NOTIFICATIONS: null, WHATSAPP_NOTIFICATIONS: null };
  for (const r of rows) if (out[r.type] === null) out[r.type] = r.granted;
  return out;
}

/**
 * Notifica al paciente un evento de su cita por los canales autorizados.
 * - Correo: mensajes transaccionales salvo que el paciente haya retirado el consentimiento.
 * - WhatsApp: solo con consentimiento explícito.
 * Nunca incluye información clínica. Los errores de integración no interrumpen la operación.
 */
export async function notifyAppointmentEvent(appointmentId: string, event: MessageEvent, opts: { dedupeKey?: string } = {}) {
  try {
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: { select: { id: true, email: true, status: true } } } }, professional: true, service: true },
    });
    if (!appt) return;
    const consents = await latestConsents(appt.patientId);
    const vars = appointmentVars(appt);
    const email = appt.patient.user?.email ?? appt.patient.email;
    const base = { event, vars, patientId: appt.patientId, appointmentId, userId: appt.patient.userId };
    await queueMessage({
      ...base,
      channel: "EMAIL",
      recipient: email,
      skipReason: consents.EMAIL_NOTIFICATIONS === false ? "SIN_CONSENTIMIENTO" : undefined,
      dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:email` : undefined,
    });
    const settings = await getSystemSetting("notifications");
    if (settings.whatsappEnabled || consents.WHATSAPP_NOTIFICATIONS) {
      await queueMessage({
        ...base,
        channel: "WHATSAPP",
        recipient: appt.patient.phone,
        skipReason: consents.WHATSAPP_NOTIFICATIONS !== true ? "SIN_CONSENTIMIENTO" : undefined,
        dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:whatsapp` : undefined,
      });
    }
    if (appt.patient.userId && IN_APP_TITLES[event]) {
      await notifyUser(appt.patient.userId, {
        title: IN_APP_TITLES[event]!,
        body: `${appt.service.name} · ${formatLongDate(appt.startsAt)} a las ${formatTime(appt.startsAt)}`,
        href: `/portal/citas/${appt.id}`,
      });
    }
    kickMessageQueue();
  } catch (error) {
    console.error("[cmio] No se pudo registrar la notificación de la cita:", safeErrorSummary(error));
  }
}

/**
 * Encola recordatorios para las citas que comienzan dentro de la ventana configurada.
 * Usa el horario real de la cita y una clave de deduplicación por horario
 * (si la cita se reprograma, se genera un nuevo recordatorio).
 */
export async function queueDueReminders(now = new Date()) {
  const settings = await getSystemSetting("notifications");
  const windowEnd = new Date(now.getTime() + settings.reminderHoursBefore * 3600_000);
  const due = await db.appointment.findMany({
    where: { status: { in: ["SCHEDULED", "CONFIRMED"] }, startsAt: { gt: now, lte: windowEnd }, reminderQueuedAt: null },
    select: { id: true, startsAt: true },
    take: 200,
  });
  for (const a of due) {
    const claimed = await db.appointment.updateMany({ where: { id: a.id, reminderQueuedAt: null }, data: { reminderQueuedAt: now } });
    if (claimed.count === 1) {
      await notifyAppointmentEvent(a.id, "APPOINTMENT_REMINDER", { dedupeKey: `recordatorio:${a.id}:${a.startsAt.toISOString()}` });
    }
  }
  return due.length;
}
