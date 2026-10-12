"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { CalendarSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchSlotsAction, type DayDTO } from "@/actions/scheduling";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { CLINIC_TIME_ZONE, LOCALE, formatLongDate, formatTime } from "@/lib/format";

type Props = {
  professionalId: string;
  serviceId: string;
  value: string | null;
  onChange: (startsAt: string | null) => void;
  /** El personal ve también los turnos ocupados (atenuados). */
  showTaken?: boolean;
  excludeAppointmentId?: string;
  initialDate?: string;
  daysPerPage?: number;
};

function todayLocalISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TIME_ZONE }).format(new Date());
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dayName = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });
const dayNum = new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });

function localHour(iso: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: CLINIC_TIME_ZONE }).format(new Date(iso)));
}

export function SlotPicker({ professionalId, serviceId, value, onChange, showTaken, excludeAppointmentId, initialDate, daysPerPage = 14 }: Props) {
  const [from, setFrom] = useState(initialDate ?? todayLocalISO());
  const [days, setDays] = useState<DayDTO[]>([]);
  const [nextDates, setNextDates] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    (fromISO: string, preferDay?: string) => {
      startTransition(async () => {
        const res = await fetchSlotsAction({ professionalId, serviceId, fromISO, days: daysPerPage, excludeAppointmentId });
        if (!res.ok) {
          setError(res.message);
          setDays([]);
          return;
        }
        setError(null);
        setDays(res.days);
        setNextDates(res.nextDates);
        const firstWithSlots = res.days.find((d) => d.slots.some((s) => s.available))?.date ?? null;
        setSelectedDay(preferDay && res.days.some((d) => d.date === preferDay) ? preferDay : firstWithSlots);
      });
    },
    [professionalId, serviceId, daysPerPage, excludeAppointmentId],
  );

  useEffect(() => {
    onChange(null);
    load(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, serviceId]);

  const goTo = (fromISO: string, preferDay?: string) => {
    setFrom(fromISO);
    onChange(null);
    load(fromISO, preferDay);
  };

  const today = todayLocalISO();
  const current = days.find((d) => d.date === selectedDay);
  const morning = current?.slots.filter((s) => localHour(s.startsAt) < 12) ?? [];
  const afternoon = current?.slots.filter((s) => localHour(s.startsAt) >= 12) ?? [];
  const hasAny = days.some((d) => d.slots.some((s) => s.available));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goTo(addDays(from, -daysPerPage))}
          disabled={from <= today || pending}
          className="tap-target inline-flex items-center justify-center rounded-xl border border-line bg-surface text-ink disabled:opacity-40"
          aria-label="Fechas anteriores"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="text-sm font-medium text-ink" aria-live="polite">
          {formatLongDate(`${from}T12:00:00Z`).replace(/^\w+, /, "")} – {formatLongDate(`${addDays(from, daysPerPage - 1)}T12:00:00Z`).replace(/^\w+, /, "")}
        </p>
        <button
          type="button"
          onClick={() => goTo(addDays(from, daysPerPage))}
          disabled={pending}
          className="tap-target inline-flex items-center justify-center rounded-xl border border-line bg-surface text-ink disabled:opacity-40"
          aria-label="Fechas siguientes"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {pending && !days.length ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner label="Buscando horarios disponibles…" />
        </div>
      ) : (
        <div className={cn("space-y-4", pending && "opacity-60")} aria-busy={pending}>
          <div role="radiogroup" aria-label="Fecha" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-thin">
            {days.map((d) => {
              const count = d.slots.filter((s) => s.available).length;
              const selected = d.date === selectedDay;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={count === 0}
                  onClick={() => {
                    setSelectedDay(d.date);
                    onChange(null);
                  }}
                  className={cn(
                    "flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors",
                    selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary",
                    count === 0 && "cursor-not-allowed border-dashed bg-canvas text-slate-400 hover:border-line",
                  )}
                >
                  <span className="text-xs capitalize">{dayName.format(new Date(`${d.date}T12:00:00Z`))}</span>
                  <span className="text-xl font-bold leading-tight">{dayNum.format(new Date(`${d.date}T12:00:00Z`))}</span>
                  <span className="text-[0.7rem] capitalize">{monthName.format(new Date(`${d.date}T12:00:00Z`))}</span>
                  <span className={cn("mt-1 text-[0.65rem] font-medium", selected ? "text-white/85" : count ? "text-primary" : "")}>
                    {count ? `${count} libre${count === 1 ? "" : "s"}` : "Sin turnos"}
                  </span>
                </button>
              );
            })}
          </div>

          {!hasAny && !pending ? (
            <div className="rounded-xl border border-dashed border-line-strong bg-canvas p-5 text-center text-sm text-muted">
              <CalendarSearch className="mx-auto mb-2 size-6 text-primary" aria-hidden="true" />
              No hay horarios disponibles en estas fechas.
              {nextDates.length ? (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="w-full">Próximas fechas con disponibilidad:</span>
                  {nextDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-tint"
                      onClick={() => goTo(d, d)}
                    >
                      {formatLongDate(`${d}T12:00:00Z`)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2">Comunícate con la secretaría para coordinar un horario.</p>
              )}
            </div>
          ) : null}

          {current ? (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-ink first-letter:uppercase">{formatLongDate(`${current.date}T12:00:00Z`)}</legend>
              {[
                { label: "Mañana", items: morning },
                { label: "Tarde", items: afternoon },
              ]
                .filter((g) => g.items.length)
                .map((g) => (
                  <div key={g.label} className="mb-4">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g.label}</p>
                    <div role="radiogroup" aria-label={`Horarios de la ${g.label.toLowerCase()}`} className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-5 lg:grid-cols-6">
                      {g.items.map((s) => {
                        const selected = value === s.startsAt;
                        const taken = !s.available;
                        if (taken && !showTaken) return null;
                        return (
                          <button
                            key={s.startsAt}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={taken}
                            title={taken ? "Ocupado" : undefined}
                            onClick={() => onChange(s.startsAt)}
                            className={cn(
                              "min-h-11 rounded-xl border text-sm font-semibold transition-colors",
                              selected ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary hover:text-primary",
                              taken && "cursor-not-allowed border-dashed bg-canvas text-slate-400 line-through hover:border-line hover:text-slate-400",
                            )}
                          >
                            {formatTime(s.startsAt)}
                            {s.remaining > 1 && !taken ? <span className="block text-[0.65rem] font-normal">{s.remaining} lugares</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              <p className="text-xs text-muted">Horarios en hora de Paraguay. Se muestran solo los turnos disponibles en la agenda real.</p>
            </fieldset>
          ) : null}
        </div>
      )}
    </div>
  );
}
