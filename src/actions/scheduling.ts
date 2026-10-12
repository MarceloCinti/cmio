"use server";

import { z } from "@/lib/validation/zod-es";
import { getCurrentActor } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getAvailability, nextAvailableDates } from "@/server/services/availability";
import { getSystemSetting } from "@/server/services/settings";
import { addDaysISO, isValidISODate, todayISO } from "@/lib/time";
import { db } from "@/server/db";

export type SlotDTO = { startsAt: string; endsAt: string; available: boolean; remaining: number };
export type DayDTO = { date: string; slots: SlotDTO[] };
export type SlotsResult = { ok: true; days: DayDTO[]; nextDates: string[] } | { ok: false; message: string };

const schema = z.object({
  professionalId: z.string().min(1).max(64),
  serviceId: z.string().min(1).max(64),
  fromISO: z.string().refine(isValidISODate),
  days: z.number().int().min(1).max(31),
  excludeAppointmentId: z.string().max(64).optional(),
});

/** Turnos reales para el selector de horarios (portal y panel). */
export async function fetchSlotsAction(input: z.input<typeof schema>): Promise<SlotsResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tu sesión expiró. Ingresa nuevamente." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Los datos de la búsqueda no son válidos." };
  const { professionalId, serviceId, days, excludeAppointmentId } = parsed.data;
  const isPatient = actor.role === "PATIENT";
  if (!isPatient && !can(actor, "citas.gestionar") && actor.professionalId !== professionalId) {
    return { ok: false, message: "No tienes permiso para consultar esta agenda." };
  }
  if (isPatient) {
    const prof = await db.professional.findFirst({
      where: { id: professionalId, status: "ACTIVE", isPublished: true, acceptsOnlineBooking: true },
      select: { id: true },
    });
    if (!prof) return { ok: false, message: "Este profesional no recibe reservas en línea." };
  }
  const fromISO = parsed.data.fromISO < todayISO() ? todayISO() : parsed.data.fromISO;
  const policy = isPatient ? await getSystemSetting("booking") : null;
  const result = await getAvailability({
    professionalId,
    serviceId,
    fromISO,
    toISO: addDaysISO(fromISO, days - 1),
    policy,
    ignoreAppointmentId: excludeAppointmentId,
  });
  const daysDto: DayDTO[] = result.map((d) => ({
    date: d.date,
    slots: d.slots
      .filter((s) => !isPatient || s.available)
      .filter((s) => s.startsAt.getTime() > Date.now())
      .map((s) => ({ startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), available: s.available, remaining: s.remaining })),
  }));
  const hasAny = daysDto.some((d) => d.slots.some((s) => s.available));
  const nextDates = hasAny
    ? []
    : await nextAvailableDates({ professionalId, serviceId, policy, ignoreAppointmentId: excludeAppointmentId }, addDaysISO(fromISO, days), 60, 3);
  return { ok: true, days: daysDto, nextDates };
}
