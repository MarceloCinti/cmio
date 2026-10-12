import { NextResponse } from "next/server";
import { db } from "@/server/db";

// Verificación de estado para el monitoreo del despliegue (sin datos sensibles).
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ estado: "error", detalle: "Base de datos no disponible" }, { status: 503 });
  }
}
