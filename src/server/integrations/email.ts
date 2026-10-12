import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/env";

export class IntegrationNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationNotConfiguredError";
  }
}

export type EmailMessage = { to: string; subject: string; text: string; html?: string };
export type SendResult = { providerMessageId?: string };

let transporter: Transporter | undefined;

/** Solo para pruebas: descarta el transporte SMTP en memoria. */
export function resetEmailTransportForTests() {
  transporter = undefined;
}

export function emailStatus(): { configured: boolean; driver: string; detail: string } {
  const e = env();
  if (e.EMAIL_DRIVER === "smtp") {
    const ok = Boolean(e.SMTP_HOST && e.SMTP_PORT && e.EMAIL_FROM);
    return {
      configured: ok,
      driver: "smtp",
      detail: ok ? `SMTP ${e.SMTP_HOST}:${e.SMTP_PORT}` : "Faltan SMTP_HOST, SMTP_PORT o EMAIL_FROM.",
    };
  }
  if (e.EMAIL_DRIVER === "file") {
    return {
      configured: true,
      driver: "file",
      detail: "Modo desarrollo: los correos se guardan como archivos en .data/mail y NO se envían.",
    };
  }
  return { configured: false, driver: "disabled", detail: "El envío de correos no está configurado (EMAIL_DRIVER=disabled)." };
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const e = env();
  if (e.EMAIL_DRIVER === "disabled") {
    throw new IntegrationNotConfiguredError("El envío de correos no está configurado.");
  }
  const from = e.EMAIL_FROM ?? "CMIO <no-responder@localhost>";
  if (e.EMAIL_DRIVER === "file") {
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.EMAIL_FILE_DIR ?? path.join(/* turbopackIgnore: true */ ".data", "mail"));
    await mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const content = [`From: ${from}`, `To: ${message.to}`, `Subject: ${message.subject}`, `Date: ${new Date().toUTCString()}`, "", message.text].join("\n");
    await writeFile(path.join(dir, `${id}.eml`), content, { encoding: "utf8", mode: 0o600 });
    return { providerMessageId: `file:${id}` };
  }
  if (!e.SMTP_HOST || !e.SMTP_PORT) {
    throw new IntegrationNotConfiguredError("Faltan los datos del servidor SMTP.");
  }
  transporter ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  const info = await transporter.sendMail({ from, to: message.to, subject: message.subject, text: message.text, html: message.html });
  return { providerMessageId: info.messageId };
}
