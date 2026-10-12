import "server-only";
import { env } from "@/server/env";
import { IntegrationNotConfiguredError, type SendResult } from "./email";

// Integración con la API oficial de WhatsApp Business (Meta Cloud API).
// Los mensajes iniciados por la clínica deben usar plantillas aprobadas por Meta.
// Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api

export function whatsappStatus(): { configured: boolean; detail: string } {
  const e = env();
  if (e.WHATSAPP_PROVIDER !== "meta") {
    return { configured: false, detail: "WhatsApp no está configurado (WHATSAPP_PROVIDER=disabled)." };
  }
  if (!e.WHATSAPP_PHONE_NUMBER_ID || !e.WHATSAPP_ACCESS_TOKEN) {
    return { configured: false, detail: "Faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN." };
  }
  return { configured: true, detail: `WhatsApp Cloud API (${e.WHATSAPP_API_VERSION})` };
}

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    readonly retriable: boolean,
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  language: string;
  params: string[];
}): Promise<SendResult> {
  const e = env();
  const status = whatsappStatus();
  if (!status.configured) throw new IntegrationNotConfiguredError(status.detail);
  const url = `https://graph.facebook.com/${e.WHATSAPP_API_VERSION}/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.language },
      components: input.params.length
        ? [{ type: "body", parameters: input.params.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }]
        : [],
    },
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      const retriable = res.status >= 500 || res.status === 429;
      throw new WhatsAppApiError(`WhatsApp respondió ${res.status}: ${json.error?.message ?? "error desconocido"}`, retriable);
    }
    return { providerMessageId: json.messages?.[0]?.id };
  } finally {
    clearTimeout(timeout);
  }
}
