import { DateTime } from "luxon";
import { CLINIC_TIME_ZONE } from "./format";

// Utilidades de calendario en la zona horaria de la clínica (America/Asuncion).
// Las fechas locales se representan como cadenas ISO "AAAA-MM-DD".

export function nowLocal() {
  return DateTime.now().setZone(CLINIC_TIME_ZONE);
}

export function todayISO(): string {
  return nowLocal().toISODate()!;
}

export function isValidISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value, { zone: CLINIC_TIME_ZONE }).isValid;
}

export function parseISODate(value: string) {
  return DateTime.fromISO(value, { zone: CLINIC_TIME_ZONE }).startOf("day");
}

/** Convierte una fecha local + minutos desde medianoche a un instante UTC. */
export function localToUtc(dateISO: string, minuteOfDay: number): Date {
  return parseISODate(dateISO).plus({ minutes: minuteOfDay }).toJSDate();
}

/** Rango [inicio, fin) del día local en UTC. */
export function localDayRange(dateISO: string): { start: Date; end: Date } {
  const start = parseISODate(dateISO);
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
}

export function toLocal(date: Date) {
  return DateTime.fromJSDate(date).setZone(CLINIC_TIME_ZONE);
}

export function localISODateOf(date: Date): string {
  return toLocal(date).toISODate()!;
}

export function minuteOfDayOf(date: Date): number {
  const l = toLocal(date);
  return l.hour * 60 + l.minute;
}

/** 1 = lunes … 7 = domingo */
export function weekdayOfISO(dateISO: string): number {
  return parseISODate(dateISO).weekday;
}

export function addDaysISO(dateISO: string, days: number): string {
  return parseISODate(dateISO).plus({ days }).toISODate()!;
}

export function startOfWeekISO(dateISO: string): string {
  return parseISODate(dateISO).startOf("week").toISODate()!;
}

export function startOfMonthISO(dateISO: string): string {
  return parseISODate(dateISO).startOf("month").toISODate()!;
}

export function daysBetweenISO(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  let cursor = parseISODate(fromISO);
  const end = parseISODate(toISO);
  while (cursor <= end && out.length < 400) {
    out.push(cursor.toISODate()!);
    cursor = cursor.plus({ days: 1 });
  }
  return out;
}

/** Convierte "AAAA-MM-DD" a Date a medianoche UTC para columnas DATE de PostgreSQL. */
export function isoToDbDate(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

export function dbDateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}
