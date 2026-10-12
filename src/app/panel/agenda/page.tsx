import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { QuerySelect, SegmentedLinks } from "@/components/panel/query-controls";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { listAgenda, type AppointmentWithRelations } from "@/server/services/appointments";
import { professionalDisplayName } from "@/server/services/public-site";
import { db } from "@/server/db";
import { APPOINTMENT_STATUS_BAR, APPOINTMENT_STATUS_LABELS, type AppointmentStatusKey } from "@/lib/labels";
import { formatLongDate, formatTime } from "@/lib/format";
import { addDaysISO, daysBetweenISO, isValidISODate, localISODateOf, startOfMonthISO, startOfWeekISO, todayISO, weekdayOfISO } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata = { title: "Agenda" };

type View = "dia" | "semana" | "mes";

export default async function AgendaPage({ searchParams }: PageProps<"/panel/agenda">) {
  const actor = await requireStaff();
  const sp = await searchParams;
  const view: View = sp.vista === "semana" || sp.vista === "mes" ? sp.vista : "dia";
  const date = typeof sp.fecha === "string" && isValidISODate(sp.fecha) ? sp.fecha : todayISO();
  const seeAll = can(actor, "agenda.ver_todas") || can(actor, "recepcion.gestionar") || can(actor, "citas.gestionar");
  const professionalId = seeAll ? (typeof sp.profesional === "string" ? sp.profesional : "") : (actor.professionalId ?? "");
  const status = typeof sp.estado === "string" && sp.estado in APPOINTMENT_STATUS_LABELS ? (sp.estado as AppointmentStatusKey) : "";

  let from = date;
  let to = date;
  if (view === "semana") {
    from = startOfWeekISO(date);
    to = addDaysISO(from, 6);
  } else if (view === "mes") {
    from = startOfMonthISO(date);
    to = addDaysISO(startOfMonthISO(addDaysISO(from, 32)), -1);
  }

  const [appointments, professionals] = await Promise.all([
    listAgenda(actor, { fromISO: from, toISO: to, professionalId: professionalId || null, statuses: status ? [status] : undefined }),
    seeAll ? db.professional.findMany({ where: { status: "ACTIVE" }, orderBy: { lastName: "asc" }, select: { id: true, honorific: true, firstName: true, lastName: true } }) : Promise.resolve([]),
  ]);

  const q = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { vista: view, fecha: date, profesional: professionalId, estado: status, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/panel/agenda?${p.toString()}`;
  };
  const step = view === "dia" ? 1 : view === "semana" ? 7 : 31;
  const prev = view === "mes" ? startOfMonthISO(addDaysISO(from, -1)) : addDaysISO(date, -step);
  const next = view === "mes" ? addDaysISO(to, 1) : addDaysISO(date, step);
  const title =
    view === "dia"
      ? formatLongDate(`${date}T12:00:00Z`)
      : view === "semana"
        ? `Semana del ${formatLongDate(`${from}T12:00:00Z`).replace(/^[^,]+, /, "")}`
        : new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T12:00:00Z`));

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={seeAll ? "Citas de todos los profesionales según los filtros." : "Tus citas programadas."}
        actions={
          can(actor, "citas.gestionar") ? (
            <ButtonLink href={`/panel/citas/nueva?fecha=${date}${professionalId ? `&profesional=${professionalId}` : ""}`} icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
              Nueva cita
            </ButtonLink>
          ) : null
        }
      />
      <Card className="mb-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={q({ fecha: prev })} variant="outline" size="sm" aria-label="Anterior">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href={q({ fecha: todayISO() })} variant="outline" size="sm">
              Hoy
            </ButtonLink>
            <ButtonLink href={q({ fecha: next })} variant="outline" size="sm" aria-label="Siguiente">
              <ChevronRight className="size-4" aria-hidden="true" />
            </ButtonLink>
            <h2 className="ml-1 text-base font-semibold text-ink first-letter:uppercase sm:text-lg" aria-live="polite">
              {title}
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <SegmentedLinks
              label="Vista"
              current={view}
              items={[
                { value: "dia", label: "Día", href: q({ vista: "dia" }) },
                { value: "semana", label: "Semana", href: q({ vista: "semana" }) },
                { value: "mes", label: "Mes", href: q({ vista: "mes" }) },
              ]}
            />
            {seeAll ? (
              <QuerySelect
                name="profesional"
                label="Profesional"
                value={professionalId}
                allLabel="Todos"
                options={professionals.map((p) => ({ value: p.id, label: professionalDisplayName(p) }))}
                className="w-52"
              />
            ) : null}
            <QuerySelect
              name="estado"
              label="Estado"
              value={status}
              allLabel="Todos"
              options={Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {view === "dia" ? <DayView appointments={appointments} groupByProfessional={seeAll && !professionalId} /> : null}
      {view === "semana" ? <WeekView appointments={appointments} from={from} q={q} /> : null}
      {view === "mes" ? <MonthView appointments={appointments} from={from} to={to} q={q} /> : null}

      <Legend />
    </div>
  );
}

function ApptCard({ a, compact, showProfessional }: { a: AppointmentWithRelations; compact?: boolean; showProfessional?: boolean }) {
  return (
    <Link
      href={`/panel/citas/${a.id}`}
      className={cn(
        "block rounded-xl border border-line border-l-4 bg-surface p-3 shadow-soft transition-shadow hover:shadow-lift",
        APPOINTMENT_STATUS_BAR[a.status],
        a.status === "CANCELLED" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink tabular-nums">
          {formatTime(a.startsAt)}
          {!compact ? <span className="font-normal text-muted"> – {formatTime(a.endsAt)}</span> : null}
        </p>
        {!compact ? <AppointmentStatusBadge status={a.status} /> : null}
      </div>
      <p className={cn("mt-1 font-medium text-ink", compact ? "truncate text-xs" : "text-sm")}>
        {a.patient.lastName}, {a.patient.firstName}
      </p>
      {!compact ? (
        <p className="mt-0.5 text-xs text-muted">
          {a.service.name}
          {showProfessional ? ` · ${professionalDisplayName(a.professional)}` : ""}
          {a.isOverbook ? " · Sobreturno" : ""}
        </p>
      ) : null}
    </Link>
  );
}

function DayView({ appointments, groupByProfessional }: { appointments: AppointmentWithRelations[]; groupByProfessional: boolean }) {
  if (!appointments.length) {
    return (
      <Card>
        <EmptyState title="No hay citas para este día" description="Cambia la fecha o los filtros para ver otras citas." />
      </Card>
    );
  }
  if (!groupByProfessional) {
    return (
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {appointments.map((a) => (
          <li key={a.id}>
            <ApptCard a={a} />
          </li>
        ))}
      </ul>
    );
  }
  const groups = new Map<string, { name: string; items: AppointmentWithRelations[] }>();
  for (const a of appointments) {
    const g = groups.get(a.professionalId) ?? { name: professionalDisplayName(a.professional), items: [] };
    g.items.push(a);
    groups.set(a.professionalId, g);
  }
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[...groups.entries()].map(([id, g]) => (
        <section key={id} aria-label={g.name} className="space-y-3">
          <h3 className="flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
            {g.name} <span className="text-xs font-medium">{g.items.length} cita(s)</span>
          </h3>
          <ul className="space-y-3">
            {g.items.map((a) => (
              <li key={a.id}>
                <ApptCard a={a} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function WeekView({ appointments, from, q }: { appointments: AppointmentWithRelations[]; from: string; q: (p: Record<string, string>) => string }) {
  const days = daysBetweenISO(from, addDaysISO(from, 6));
  const today = todayISO();
  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((d) => {
        const items = appointments.filter((a) => localISODateOf(a.startsAt) === d);
        return (
          <section key={d} className={cn("rounded-2xl border border-line bg-canvas p-2", d === today && "border-primary")}>
            <Link href={q({ vista: "dia", fecha: d })} className="mb-2 flex items-center justify-between rounded-lg px-2 py-1 hover:bg-primary-soft">
              <span className="text-sm font-semibold text-ink capitalize">
                {new Intl.DateTimeFormat("es-PY", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
              </span>
              <span className="text-xs text-muted">{items.length || ""}</span>
            </Link>
            {items.length ? (
              <ul className="space-y-2">
                {items.map((a) => (
                  <li key={a.id}>
                    <ApptCard a={a} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 pb-2 text-xs text-muted">Sin citas</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MonthView({ appointments, from, to, q }: { appointments: AppointmentWithRelations[]; from: string; to: string; q: (p: Record<string, string>) => string }) {
  const lead = weekdayOfISO(from) - 1;
  const days = daysBetweenISO(from, to);
  const today = todayISO();
  const counts = new Map<string, { total: number; active: number }>();
  for (const a of appointments) {
    const d = localISODateOf(a.startsAt);
    const c = counts.get(d) ?? { total: 0, active: 0 };
    c.total++;
    if (!["CANCELLED", "NO_SHOW"].includes(a.status)) c.active++;
    counts.set(d, c);
  }
  return (
    <Card className="p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden="true">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => {
          const c = counts.get(d);
          return (
            <Link
              key={d}
              href={q({ vista: "dia", fecha: d })}
              className={cn(
                "flex min-h-16 flex-col rounded-lg border border-line p-1.5 text-left hover:border-primary sm:min-h-20",
                d === today && "border-primary bg-primary-soft",
              )}
              aria-label={`${formatLongDate(`${d}T12:00:00Z`)}: ${c?.active ?? 0} citas activas`}
            >
              <span className="text-sm font-semibold text-ink">{Number(d.slice(8))}</span>
              {c?.active ? <span className="mt-auto rounded-md bg-primary px-1.5 py-0.5 text-center text-[0.7rem] font-semibold text-white">{c.active}</span> : null}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted" aria-label="Referencias de colores">
      {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatusKey[]).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-1 rounded border-l-4", APPOINTMENT_STATUS_BAR[s])} aria-hidden="true" />
          {APPOINTMENT_STATUS_LABELS[s]}
        </li>
      ))}
    </ul>
  );
}
