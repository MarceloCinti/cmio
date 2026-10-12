import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth/current";
import { exportAppointmentsCsv } from "@/server/services/reports";
import { AppError } from "@/server/errors";
import { isValidISODate, todayISO } from "@/lib/time";

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor || actor.role === "PATIENT") return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const url = new URL(request.url);
  const from = url.searchParams.get("desde") ?? todayISO();
  const to = url.searchParams.get("hasta") ?? todayISO();
  if (!isValidISODate(from) || !isValidISODate(to)) return NextResponse.json({ error: "Fechas inválidas." }, { status: 400 });
  try {
    const csv = await exportAppointmentsCsv(actor, {
      fromISO: from,
      toISO: to,
      professionalId: url.searchParams.get("profesional"),
      specialtyId: url.searchParams.get("especialidad"),
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="citas_${from}_${to}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
