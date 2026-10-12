import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { requirePatient } from "@/server/auth/current";
import { listPatientAppointments } from "@/server/services/appointments";
import { professionalDisplayName } from "@/server/services/public-site";
import { formatLongDate, formatTime } from "@/lib/format";

export const metadata = { title: "Mis citas" };

export default async function MyAppointmentsPage() {
  const actor = await requirePatient();
  const all = await listPatientAppointments(actor, actor.patientId);
  const now = Date.now();
  const upcoming = all
    .filter((a) => a.endsAt.getTime() > now && ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const history = all.filter((a) => !upcoming.includes(a));

  const List = ({ items }: { items: typeof all }) => (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.id}>
          <Link href={`/portal/citas/${a.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-primary-soft/40 sm:px-5">
            <div className="w-14 shrink-0 rounded-xl bg-primary-soft py-2 text-center text-primary">
              <span className="block text-lg leading-none font-bold">{new Intl.DateTimeFormat("es-PY", { day: "numeric", timeZone: "America/Asuncion" }).format(a.startsAt)}</span>
              <span className="block text-[0.7rem] uppercase">{new Intl.DateTimeFormat("es-PY", { month: "short", timeZone: "America/Asuncion" }).format(a.startsAt)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{a.service.name}</p>
              <p className="text-sm text-muted">
                <span className="first-letter:uppercase">{formatLongDate(a.startsAt)}</span> · {formatTime(a.startsAt)} · {professionalDisplayName(a.professional)}
              </p>
              <div className="mt-1.5">
                <AppointmentStatusBadge status={a.status} />
              </div>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Mis citas</h1>
          <p className="mt-1 text-muted">Consulta, confirma, cancela o reprograma tus citas.</p>
        </div>
        <ButtonLink href="/portal/citas/nueva" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
          Agendar una consulta
        </ButtonLink>
      </div>
      <section aria-labelledby="proximas">
        <h2 id="proximas" className="mb-3 text-lg font-semibold text-ink">
          Próximas
        </h2>
        <Card>
          {upcoming.length ? (
            <List items={upcoming} />
          ) : (
            <EmptyState title="No tienes citas próximas" description="Cuando agendes una cita aparecerá aquí." />
          )}
        </Card>
      </section>
      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-lg font-semibold text-ink">
          Historial
        </h2>
        <Card>{history.length ? <List items={history} /> : <EmptyState title="Todavía no hay citas anteriores" />}</Card>
      </section>
    </div>
  );
}
