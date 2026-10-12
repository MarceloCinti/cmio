import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { safeEqual } from "@/server/auth/crypto";

// Webhook oficial de WhatsApp Cloud API para estados de entrega.
// Verificación: GET con hub.verify_token. Notificaciones: POST firmadas con X-Hub-Signature-256.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = env().WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (
    expected &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    safeEqual(url.searchParams.get("hub.verify_token") ?? "", expected)
  ) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Prohibido", { status: 403 });
}

type StatusPayload = {
  entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[] } }[] }[];
};

export async function POST(request: Request) {
  const secret = env().WHATSAPP_APP_SECRET;
  if (!secret) return new NextResponse("Webhook no configurado", { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const digest = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(digest);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Firma inválida", { status: 401 });

  let payload: StatusPayload;
  try {
    payload = JSON.parse(raw) as StatusPayload;
  } catch {
    return new NextResponse("Contenido inválido", { status: 400 });
  }
  const statuses = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.statuses ?? []) ?? []) ?? [];
  for (const s of statuses.slice(0, 100)) {
    if (!s.id || typeof s.status !== "string") continue;
    const failed = s.status === "failed";
    await db.outboundMessage.updateMany({
      where: { providerMessageId: s.id, channel: "WHATSAPP" },
      data: {
        deliveryStatus: s.status.slice(0, 20),
        ...(failed ? { status: "FAILED", lastError: (s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "Entrega fallida").slice(0, 300) } : {}),
      },
    });
  }
  return NextResponse.json({ ok: true });
}
