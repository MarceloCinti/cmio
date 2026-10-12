import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { resetEnvCacheForTests } from "@/server/env";
import { resetEmailTransportForTests } from "@/server/integrations/email";
import { processMessageQueue, queueMessage, sendSecurityEmail } from "@/server/services/messaging";
import { notifyAppointmentEvent } from "@/server/services/appointment-notifications";
import { bookAppointment } from "@/server/services/appointments";
import { updateSystemSetting } from "@/server/services/settings";
import { updateTemplate } from "@/server/services/messages-admin";
import { ForbiddenError } from "@/server/errors";
import { runScheduledJobs } from "@/server/services/maintenance";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/system-settings";
import { addDaysISO, localToUtc, todayISO } from "@/lib/time";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";
import { actorFor, createPatient, createProfessionalWithSchedule, createUser, resetDatabase } from "../helpers/db";

function setEnv(patch: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetEnvCacheForTests();
  resetEmailTransportForTests();
}

const vars = { nombre: "Ana", fecha: "lunes", hora: "09:00", profesional: "Prof", servicio: "Consulta", codigo: "X", enlace: "http://x" };

describe("Mensajería y recuperación ante fallos", () => {
  beforeEach(async () => {
    await resetDatabase();
    setEnv({ EMAIL_DRIVER: "file", WHATSAPP_PROVIDER: "disabled" });
  });
  afterEach(() => setEnv({ EMAIL_DRIVER: "file", SMTP_HOST: undefined, SMTP_PORT: undefined, WHATSAPP_PROVIDER: "disabled" }));

  it("no simula envíos cuando la integración no está configurada", async () => {
    setEnv({ EMAIL_DRIVER: "disabled" });
    const msg = await queueMessage({ channel: "EMAIL", event: "APPOINTMENT_REMINDER", recipient: "a@prueba.local", vars });
    expect(msg?.status).toBe("SKIPPED");
    expect(msg?.skipReason).toBe("NO_CONFIGURADO");
    const res = await sendSecurityEmail({ event: "PASSWORD_RESET", to: "a@prueba.local", name: "Ana", link: "http://x" });
    expect(res.sent).toBe(false);
  });

  it("WhatsApp sin credenciales queda registrado como no enviado", async () => {
    await updateSystemSetting(await actorFor((await createUser("OWNER")).id), "notifications", { ...DEFAULT_NOTIFICATION_SETTINGS, whatsappEnabled: true });
    const msg = await queueMessage({ channel: "WHATSAPP", event: "APPOINTMENT_REMINDER", recipient: "0981 123 456", vars });
    expect(msg?.status).toBe("SKIPPED");
    expect(msg?.skipReason).toBe("NO_CONFIGURADO");
    expect(msg?.recipient).toBe("595981123456");
  });

  it("reintenta con espera creciente cuando el servidor SMTP falla y marca fallido al agotar intentos", async () => {
    setEnv({ EMAIL_DRIVER: "smtp", SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", EMAIL_FROM: "CMIO <x@prueba.local>" });
    const msg = await queueMessage({ channel: "EMAIL", event: "APPOINTMENT_REMINDER", recipient: "a@prueba.local", vars });
    expect(msg?.status).toBe("PENDING");
    const first = await processMessageQueue();
    expect(first.retried).toBe(1);
    let row = await db.outboundMessage.findUniqueOrThrow({ where: { id: msg!.id } });
    expect(row.status).toBe("PENDING");
    expect(row.attempts).toBe(1);
    expect(row.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now() + 60_000);
    expect(row.lastError).toBeTruthy();
    for (let i = 0; i < 4; i++) {
      await db.outboundMessage.update({ where: { id: msg!.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      await processMessageQueue();
    }
    row = await db.outboundMessage.findUniqueOrThrow({ where: { id: msg!.id } });
    expect(row.status).toBe("FAILED");
    expect(row.attempts).toBe(5);
  });

  it("una falla del proveedor no impide agendar la cita", async () => {
    setEnv({ EMAIL_DRIVER: "smtp", SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", EMAIL_FROM: "CMIO <x@prueba.local>" });
    const { professional, service } = await createProfessionalWithSchedule();
    const { patient } = await createPatient();
    const sec = await actorFor((await createUser("SECRETARY")).id);
    const appt = await bookAppointment(sec, {
      patientId: patient.id,
      professionalId: professional.id,
      serviceId: service.id,
      startsAt: localToUtc(addDaysISO(todayISO(), 2), 540).toISOString(),
    });
    expect(appt.id).toBeTruthy();
    expect(await db.outboundMessage.count({ where: { appointmentId: appt.id } })).toBeGreaterThan(0);
  });

  it("respeta el retiro del consentimiento para comunicaciones por correo", async () => {
    const { professional, service } = await createProfessionalWithSchedule();
    const { patient } = await createPatient();
    await db.consent.create({ data: { patientId: patient.id, type: "EMAIL_NOTIFICATIONS", granted: false, policyVersion: "t", source: "PORTAL" } });
    const sec = await actorFor((await createUser("SECRETARY")).id);
    const appt = await bookAppointment(sec, {
      patientId: patient.id,
      professionalId: professional.id,
      serviceId: service.id,
      startsAt: localToUtc(addDaysISO(todayISO(), 2), 600).toISOString(),
    });
    const msg = await db.outboundMessage.findFirstOrThrow({ where: { appointmentId: appt.id, channel: "EMAIL" } });
    expect(msg.status).toBe("SKIPPED");
    expect(msg.skipReason).toBe("SIN_CONSENTIMIENTO");
  });

  it("no duplica mensajes con la misma clave y la tarea programada procesa la cola", async () => {
    const { professional, service } = await createProfessionalWithSchedule();
    const { patient } = await createPatient();
    const sec = await actorFor((await createUser("SECRETARY")).id);
    const appt = await bookAppointment(sec, {
      patientId: patient.id,
      professionalId: professional.id,
      serviceId: service.id,
      startsAt: localToUtc(addDaysISO(todayISO(), 2), 660).toISOString(),
    });
    await notifyAppointmentEvent(appt.id, "APPOINTMENT_REMINDER", { dedupeKey: "k1" });
    await notifyAppointmentEvent(appt.id, "APPOINTMENT_REMINDER", { dedupeKey: "k1" });
    expect(await db.outboundMessage.count({ where: { appointmentId: appt.id, event: "APPOINTMENT_REMINDER", channel: "EMAIL" } })).toBe(1);
    const result = await runScheduledJobs();
    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(await db.outboundMessage.count({ where: { status: "PENDING" } })).toBe(0);
  });
});

describe("Plantillas de seguridad", () => {
  beforeEach(async () => {
    await resetDatabase();
    setEnv({ EMAIL_DRIVER: "file", WHATSAPP_PROVIDER: "disabled" });
  });

  it("no se pueden editar y el enlace de un solo uso nunca se guarda", async () => {
    const admin = await actorFor((await createUser("ADMIN")).id);
    const tpl = await db.messageTemplate.create({
      data: { event: "PASSWORD_RESET", channel: "EMAIL", subject: "Restablecer {{enlace}}", body: "https://otro-sitio.example/?r={{enlace}}" },
    });
    await expect(updateTemplate(admin, tpl.id, { subject: "x", body: "{{enlace}}", isActive: "on" })).rejects.toBeInstanceOf(ForbiddenError);
    // Aunque la base tuviera una plantilla alterada, se usa la plantilla fija del sistema.
    const res = await sendSecurityEmail({ event: "PASSWORD_RESET", to: "a@prueba.local", name: "Ana", link: "http://localhost/restablecer?token=SECRETO" });
    expect(res.sent).toBe(true);
    const row = await db.outboundMessage.findFirstOrThrow({ where: { event: "PASSWORD_RESET" } });
    expect(row.body).toBeNull();
    expect(row.subject).not.toContain("SECRETO");
  });
});

describe("Webhook de estados de WhatsApp", () => {
  const SECRET = "secreto-de-prueba";
  beforeEach(async () => {
    await resetDatabase();
    setEnv({ WHATSAPP_APP_SECRET: SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-verificacion" });
  });
  afterEach(() => setEnv({ WHATSAPP_APP_SECRET: undefined, WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined }));

  const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const post = (body: string, signature: string) =>
    POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body, headers: { "x-hub-signature-256": signature } }));

  it("verifica la suscripción solo con el token correcto", async () => {
    const ok = await GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token-verificacion&hub.challenge=123"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("123");
    const bad = await GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=123"));
    expect(bad.status).toBe(403);
  });

  it("rechaza notificaciones sin firma válida y actualiza el estado de entrega con firma válida", async () => {
    const msg = await db.outboundMessage.create({
      data: { channel: "WHATSAPP", event: "APPOINTMENT_REMINDER", recipient: "595981000000", status: "SENT", providerMessageId: "wamid.ABC", sentAt: new Date() },
    });
    const delivered = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.ABC", status: "delivered" }] } }] }] });
    expect((await post(delivered, sign(delivered, "otro-secreto"))).status).toBe(401);
    expect((await db.outboundMessage.findUniqueOrThrow({ where: { id: msg.id } })).deliveryStatus).toBeNull();

    expect((await post(delivered, sign(delivered))).status).toBe(200);
    expect((await db.outboundMessage.findUniqueOrThrow({ where: { id: msg.id } })).deliveryStatus).toBe("delivered");

    const failed = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.ABC", status: "failed", errors: [{ title: "Número no válido" }] }] } }] }] });
    await post(failed, sign(failed));
    const after = await db.outboundMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(after.status).toBe("FAILED");
    expect(after.lastError).toBe("Número no válido");
  });
});
