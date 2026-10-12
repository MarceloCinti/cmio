import "server-only";
import { db, type Tx } from "@/server/db";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { addDaysISO, daysBetweenISO, isoToDbDate, localDayRange, localToUtc, todayISO, weekdayOfISO } from "@/lib/time";
import type { BookingPolicy } from "@/lib/system-settings";

// Estados que ocupan el horario del profesional.
export const BLOCKING_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
// Estados de una cita "activa" (futura o en curso) para el paciente.
export const ACTIVE_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

export type Slot = { startsAt: Date; endsAt: Date; available: boolean; remaining: number };

type Rule = { weekday: number; startMinute: number; endMinute: number; validFrom: Date | null; validUntil: Date | null };
type Range = { startsAt: Date; endsAt: Date };
type ExistingAppt = Range & { id: string; serviceId: string; blocksSlot: boolean; status: AppointmentStatus };

export type SlotContext = {
  durationMinutes: number;
  capacityPerSlot: number;
  serviceId: string;
  rules: Rule[];
  exceptions: Range[];
  appointments: ExistingAppt[];
  /** Instante mínimo de inicio (ahora + anticipación). */
  earliest: Date;
  /** Instante máximo de inicio. */
  latest: Date | null;
  /** Cita a ignorar (al reprogramar). */
  ignoreAppointmentId?: string;
};

const overlaps = (a: Range, b: Range) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

function ruleAppliesOn(rule: Rule, dateISO: string) {
  const day = isoToDbDate(dateISO).getTime();
  if (rule.validFrom && day < rule.validFrom.getTime()) return false;
  if (rule.validUntil && day > rule.validUntil.getTime()) return false;
  return true;
}

/**
 * Genera los turnos de un día (función pura, sin acceso a la base de datos).
 * Los turnos se calculan en hora local de Paraguay y se expresan en UTC.
 */
export function generateDaySlots(dateISO: string, ctx: SlotContext): Slot[] {
  const weekday = weekdayOfISO(dateISO);
  const slots: Slot[] = [];
  const rules = ctx.rules
    .filter((r) => r.weekday === weekday && ruleAppliesOn(r, dateISO))
    .sort((a, b) => a.startMinute - b.startMinute);
  const seen = new Set<number>();
  for (const rule of rules) {
    for (let m = rule.startMinute; m + ctx.durationMinutes <= rule.endMinute; m += ctx.durationMinutes) {
      const startsAt = localToUtc(dateISO, m);
      const endsAt = localToUtc(dateISO, m + ctx.durationMinutes);
      if (seen.has(startsAt.getTime())) continue;
      seen.add(startsAt.getTime());
      const slot = { startsAt, endsAt };
      let available = startsAt >= ctx.earliest && (!ctx.latest || startsAt <= ctx.latest);
      if (available && ctx.exceptions.some((e) => overlaps(slot, e))) available = false;
      let remaining = ctx.capacityPerSlot;
      if (available) {
        const clashing = ctx.appointments.filter(
          (a) => a.id !== ctx.ignoreAppointmentId && BLOCKING_STATUSES.includes(a.status) && overlaps(slot, a),
        );
        if (ctx.capacityPerSlot <= 1) {
          available = clashing.length === 0;
          remaining = available ? 1 : 0;
        } else {
          // Turnos con capacidad: solo comparten horario las citas del mismo servicio y la misma hora de inicio.
          const compatible = clashing.every((a) => a.serviceId === ctx.serviceId && a.startsAt.getTime() === startsAt.getTime() && !a.blocksSlot);
          remaining = compatible ? ctx.capacityPerSlot - clashing.length : 0;
          available = remaining > 0;
        }
      } else {
        remaining = 0;
      }
      slots.push({ startsAt, endsAt, available, remaining });
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type AvailabilityOptions = {
  professionalId: string;
  serviceId: string;
  fromISO: string;
  toISO: string;
  /** Políticas para reservas desde el portal; el personal solo exige que el turno sea futuro. */
  policy?: Pick<BookingPolicy, "minLeadHours" | "maxDaysAhead"> | null;
  ignoreAppointmentId?: string;
  now?: Date;
  tx?: Tx;
};

export async function loadSlotContext(opts: AvailabilityOptions): Promise<SlotContext | null> {
  const client = opts.tx ?? db;
  const now = opts.now ?? new Date();
  const [professional, service] = await Promise.all([
    client.professional.findUnique({
      where: { id: opts.professionalId },
      select: { status: true, services: { where: { serviceId: opts.serviceId }, select: { serviceId: true } } },
    }),
    client.service.findUnique({ where: { id: opts.serviceId }, select: { id: true, durationMinutes: true, capacityPerSlot: true } }),
  ]);
  if (!professional || professional.status !== "ACTIVE" || !service || professional.services.length === 0) return null;

  const rangeStart = localDayRange(opts.fromISO).start;
  const rangeEnd = localDayRange(opts.toISO).end;
  const [rules, exceptions, appointments] = await Promise.all([
    client.scheduleRule.findMany({ where: { professionalId: opts.professionalId } }),
    client.scheduleException.findMany({
      where: {
        OR: [{ professionalId: opts.professionalId }, { professionalId: null }],
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    client.appointment.findMany({
      where: {
        professionalId: opts.professionalId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { id: true, startsAt: true, endsAt: true, serviceId: true, blocksSlot: true, status: true },
    }),
  ]);
  const earliest = opts.policy ? new Date(now.getTime() + opts.policy.minLeadHours * 3600_000) : now;
  const latest = opts.policy ? localDayRange(addDaysISO(todayISO(), opts.policy.maxDaysAhead)).end : null;
  return {
    durationMinutes: service.durationMinutes,
    capacityPerSlot: service.capacityPerSlot,
    serviceId: service.id,
    rules,
    exceptions,
    appointments,
    earliest,
    latest,
    ignoreAppointmentId: opts.ignoreAppointmentId,
  };
}

/** Turnos por día en el rango indicado (ambos extremos incluidos, máximo 62 días). */
export async function getAvailability(opts: AvailabilityOptions): Promise<{ date: string; slots: Slot[] }[]> {
  const days = daysBetweenISO(opts.fromISO, opts.toISO).slice(0, 62);
  if (!days.length) return [];
  const ctx = await loadSlotContext({ ...opts, toISO: days[days.length - 1] });
  if (!ctx) return days.map((date) => ({ date, slots: [] }));
  return days.map((date) => ({ date, slots: generateDaySlots(date, ctx) }));
}

/** Verifica que un inicio concreto sea un turno disponible según la agenda real. */
export async function isSlotAvailable(opts: AvailabilityOptions & { startsAt: Date }): Promise<{ ok: boolean; endsAt?: Date }> {
  const ctx = await loadSlotContext(opts);
  if (!ctx) return { ok: false };
  const slots = generateDaySlots(opts.fromISO, ctx);
  const match = slots.find((s) => s.startsAt.getTime() === opts.startsAt.getTime());
  return match?.available ? { ok: true, endsAt: match.endsAt } : { ok: false };
}

/** Próximas fechas con turnos libres (para sugerir alternativas al paciente). */
export async function nextAvailableDates(opts: Omit<AvailabilityOptions, "fromISO" | "toISO">, fromISO: string, days = 30, limit = 5) {
  const result = await getAvailability({ ...opts, fromISO, toISO: addDaysISO(fromISO, days) });
  return result.filter((d) => d.slots.some((s) => s.available)).slice(0, limit).map((d) => d.date);
}
