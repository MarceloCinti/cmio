import { NextResponse } from "next/server";
import { safeEqual } from "@/server/auth/crypto";
import { runScheduledJobs } from "@/server/services/maintenance";

// Llamar periódicamente con: Authorization: Bearer <CRON_SECRET>
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "CRON_SECRET no está configurado." }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !safeEqual(token, secret)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const result = await runScheduledJobs();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
