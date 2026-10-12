import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import type { MessageChannel, MessageEvent, OutboundMessage } from "@/generated/prisma/client";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_WHATSAPP_TEMPLATES,
  WHATSAPP_PARAM_ORDER,
  renderTemplate,
  type MessageEventKey,
} from "@/lib/message-templates";
import { normalizePhone } from "@/lib/site-content";
import { formatLongDate, formatTime } from "@/lib/format";
import { IntegrationNotConfiguredError, emailStatus, sendEmail } from "@/server/integrations/email";
import { WhatsAppApiError, sendWhatsAppTemplate, whatsappStatus } from "@/server/integrations/whatsapp";
import { getSiteContent, getSystemSetting } from "./settings";
import { professionalDisplayName } from "./public-site";
import { safeErrorSummary } from "@/server/errors";

const MAX_ATTEMPTS = 5;

async function loadTemplate(event: MessageEventKey, channel: MessageChannel) {
  const row = await db.messageTemplate.findUnique({ where: { event_channel: { event, channel } } });
  if (row) return row.isActive ? row : null;
  const fallback = channel === "EMAIL" ? DEFAULT_EMAIL_TEMPLATES[event] : DEFAULT_WHATSAPP_TEMPLATES[event];
  if (!fallback) return null;
  return {
    subject: fallback.subject ?? null,
    body: fallback.body,
    whatsappTemplateName: fallback.whatsappTemplateName ?? null,
    whatsappLanguage: "es",
  };
}

async function baseVars(): Promise<Record<string, string>> {
  const { institution } = await getSiteContent("published");
  return {
    clinica: `${institution.shortName} — ${institution.name}`,
    direccion: [institution.address, institution.addressReference, institution.city].filter(Boolean).join(", "),
    telefono_clinica: institution.phones[0]?.number ?? "",
  };
}

/**
 * Envía de inmediato un correo de seguridad (verificación, recuperación, invitación).
 * El contenido NO se guarda porque contiene un enlace de un solo uso.
 */
export async function sendSecurityEmail(input: {
  event: Extract<MessageEventKey, "ACCOUNT_VERIFICATION" | "PASSWORD_RESET" | "STAFF_INVITATION">;
  to: string;
  name: string;
  link: string;
  userId?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  // Plantilla fija (no editable desde el panel) para que nadie pueda redirigir el enlace de
  // un solo uso ni copiarlo en el asunto, que sí se guarda en el registro de envíos.
  const template = DEFAULT_EMAIL_TEMPLATES[input.event];
  const base = { ...(await baseVars()), nombre: input.name };
  const vars = { ...base, enlace: input.link };
  const subject = renderTemplate(template.subject ?? "Mensaje de la clínica", base);
  const status = emailStatus();
  const record = await db.outboundMessage.create({
    data: {
      channel: "EMAIL",
      event: input.event,
      recipient: input.to,
      userId: input.userId ?? null,
      subject,
      body: null,
      status: "PENDING",
    },
  });
  if (!status.configured) {
    await db.outboundMessage.update({
      where: { id: record.id },
      data: { status: "SKIPPED", skipReason: "NO_CONFIGURADO", lastError: status.detail },
    });
    return { sent: false, reason: status.detail };
  }
  try {
    const result = await sendEmail({ to: input.to, subject, text: renderTemplate(template.body, vars) });
    await db.outboundMessage.update({
      where: { id: record.id },
      data: { status: "SENT", sentAt: new Date(), attempts: 1, providerMessageId: result.providerMessageId ?? null },
    });
    return { sent: true };
  } catch (error) {
    await db.outboundMessage.update({
      where: { id: record.id },
      data: { status: "FAILED", attempts: 1, lastError: String((error as Error).message).slice(0, 500) },
    });
    return { sent: false, reason: "No se pudo enviar el correo." };
  }
}

type QueueInput = {
  channel: MessageChannel;
  event: MessageEvent;
  recipient: string | null | undefined;
  vars: Record<string, string>;
  userId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  dedupeKey?: string;
  skipReason?: string;
};

/** Registra un mensaje en la cola. Si el canal no puede usarse, queda registrado como omitido. */
export async function queueMessage(input: QueueInput): Promise<OutboundMessage | null> {
  if (input.dedupeKey) {
    const existing = await db.outboundMessage.findUnique({ where: { dedupeKey: input.dedupeKey } });
    if (existing) return existing;
  }
  const template = await loadTemplate(input.event as MessageEventKey, input.channel);
  const vars = { ...(await baseVars()), ...input.vars };
  const subject = template?.subject ? renderTemplate(template.subject, vars) : null;
  const body = template ? renderTemplate(template.body, vars) : null;

  let skipReason = input.skipReason;
  let recipient = input.recipient?.trim() ?? "";
  if (!template) skipReason ??= "SIN_PLANTILLA";
  if (!recipient) skipReason ??= "SIN_DESTINATARIO";
  if (input.channel === "WHATSAPP" && recipient) {
    const n = normalizePhone(recipient);
    if (!n) skipReason ??= "TELEFONO_INVALIDO";
    else recipient = n;
  }

  const settings = await getSystemSetting("notifications");
  if (input.channel === "EMAIL") {
    if (!settings.emailEnabled) skipReason ??= "CANAL_DESACTIVADO";
    else if (!emailStatus().configured) skipReason ??= "NO_CONFIGURADO";
  } else {
    if (!settings.whatsappEnabled) skipReason ??= "CANAL_DESACTIVADO";
    else if (!whatsappStatus().configured) skipReason ??= "NO_CONFIGURADO";
  }

  try {
    return await db.outboundMessage.create({
      data: {
        channel: input.channel,
        event: input.event,
        recipient: recipient || "(sin destinatario)",
        userId: input.userId ?? null,
        patientId: input.patientId ?? null,
        appointmentId: input.appointmentId ?? null,
        subject,
        body,
        status: skipReason ? "SKIPPED" : "PENDING",
        skipReason: skipReason ?? null,
        nextAttemptAt: skipReason ? null : new Date(),
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  } catch (error) {
    // Clave duplicada por concurrencia: el mensaje ya está en cola.
    if ((error as { code?: string }).code === "P2002") return null;
    throw error;
  }
}

async function deliver(message: OutboundMessage) {
  if (message.channel === "EMAIL") {
    return sendEmail({ to: message.recipient, subject: message.subject ?? "Mensaje de la clínica", text: message.body ?? "" });
  }
  const template = await loadTemplate(message.event as MessageEventKey, "WHATSAPP");
  if (!template?.whatsappTemplateName) {
    throw new IntegrationNotConfiguredError("La plantilla de WhatsApp no tiene un nombre aprobado configurado.");
  }
  const order = WHATSAPP_PARAM_ORDER[message.event as MessageEventKey] ?? [];
  const vars = (await rebuildVars(message)) ?? {};
  return sendWhatsAppTemplate({
    to: message.recipient,
    templateName: template.whatsappTemplateName,
    language: template.whatsappLanguage ?? "es",
    params: order.map((k) => vars[k] ?? ""),
  });
}

/** Reconstruye variables de una cita para plantillas de WhatsApp (parámetros posicionales). */
async function rebuildVars(message: OutboundMessage): Promise<Record<string, string> | null> {
  const base = await baseVars();
  if (!message.appointmentId) return base;
  const appt = await db.appointment.findUnique({
    where: { id: message.appointmentId },
    include: { patient: true, professional: true, service: true },
  });
  if (!appt) return base;
  return { ...base, ...appointmentVars(appt) };
}

export function appointmentVars(appt: {
  code: string;
  startsAt: Date;
  patient: { firstName: string };
  professional: { honorific: string | null; firstName: string; lastName: string };
  service: { name: string };
}): Record<string, string> {
  return {
    nombre: appt.patient.firstName,
    fecha: formatLongDate(appt.startsAt),
    hora: formatTime(appt.startsAt),
    profesional: professionalDisplayName(appt.professional),
    servicio: appt.service.name,
    codigo: appt.code,
    enlace: `${env().APP_URL}/portal/citas`,
  };
}

/**
 * Procesa mensajes pendientes con reintentos y espera exponencial.
 * Se ejecuta desde la tarea programada (/api/cron) y de forma oportunista tras cada evento.
 */
export async function processMessageQueue(limit = 20) {
  const now = new Date();
  const batch = await db.outboundMessage.findMany({
    where: { status: "PENDING", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const summary = { sent: 0, failed: 0, retried: 0, skipped: 0 };
  for (const message of batch) {
    // Reserva optimista: evita que dos procesos envíen el mismo mensaje.
    const claimed = await db.outboundMessage.updateMany({
      where: { id: message.id, status: "PENDING", attempts: message.attempts },
      data: { attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    if (claimed.count === 0) continue;
    const attempts = message.attempts + 1;
    try {
      const result = await deliver(message);
      await db.outboundMessage.update({
        where: { id: message.id },
        data: { status: "SENT", sentAt: new Date(), providerMessageId: result.providerMessageId ?? null, lastError: null, nextAttemptAt: null },
      });
      summary.sent++;
    } catch (error) {
      const notConfigured = error instanceof IntegrationNotConfiguredError;
      const retriable = !notConfigured && !(error instanceof WhatsAppApiError && !error.retriable) && attempts < MAX_ATTEMPTS;
      const lastError = String((error as Error).message ?? error).slice(0, 500);
      if (notConfigured) {
        await db.outboundMessage.update({
          where: { id: message.id },
          data: { status: "SKIPPED", skipReason: "NO_CONFIGURADO", lastError, nextAttemptAt: null },
        });
        summary.skipped++;
      } else if (retriable) {
        const delayMinutes = Math.min(240, 2 ** attempts * 2);
        await db.outboundMessage.update({
          where: { id: message.id },
          data: { lastError, nextAttemptAt: new Date(Date.now() + delayMinutes * 60 * 1000) },
        });
        summary.retried++;
      } else {
        await db.outboundMessage.update({ where: { id: message.id }, data: { status: "FAILED", lastError, nextAttemptAt: null } });
        summary.failed++;
      }
    }
  }
  return summary;
}

/** Procesa la cola sin bloquear ni propagar errores (uso oportunista). */
export function kickMessageQueue() {
  if (process.env.NODE_ENV === "test") return;
  processMessageQueue(10).catch((e) => console.error("[cmio] Error procesando la cola de mensajes:", safeErrorSummary(e)));
}

export async function retryMessage(id: string) {
  await db.outboundMessage.updateMany({
    where: { id, status: { in: ["FAILED", "SKIPPED"] } },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null, skipReason: null },
  });
}
