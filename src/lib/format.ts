// Formato de fechas, horas y montos para Paraguay. Sin dependencias: usable en cliente y servidor.

export const CLINIC_TIME_ZONE = "America/Asuncion";
export const LOCALE = "es-PY";

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { timeZone: CLINIC_TIME_ZONE, ...options });
    cache.set(key, f);
  }
  return f;
}

/** "lunes, 13 de octubre de 2026" */
export function formatLongDate(d: DateInput) {
  return fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(toDate(d));
}

/** "lun., 13 oct." */
export function formatShortDate(d: DateInput) {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(toDate(d));
}

/** "13/10/2026" */
export function formatNumericDate(d: DateInput) {
  return fmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(toDate(d));
}

/** "09:30" */
export function formatTime(d: DateInput) {
  return fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(toDate(d));
}

/** "13/10/2026 09:30" */
export function formatDateTime(d: DateInput) {
  return `${formatNumericDate(d)} ${formatTime(d)}`;
}

/** "lunes, 13 de octubre de 2026 a las 09:30" */
export function formatLongDateTime(d: DateInput) {
  return `${formatLongDate(d)} a las ${formatTime(d)}`;
}

/** Fechas de calendario (columnas DATE) que se guardan a medianoche UTC. */
export function formatCalendarDate(d: DateInput) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    toDate(d),
  );
}

export function formatGuaranies(amount: number | null | undefined) {
  if (amount == null) return "";
  return `Gs. ${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatDecimal(value: number | string | null | undefined, digits = 1) {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n);
}

/** Edad en años a partir de una fecha de nacimiento (columna DATE). */
export function ageFromBirthDate(birthDate: DateInput | null | undefined, now = new Date()) {
  if (!birthDate) return null;
  const b = toDate(birthDate);
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function minutesToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};
