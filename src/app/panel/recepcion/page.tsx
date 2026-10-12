import Link from "next/link";
import { CalendarPlus, Clock, Phone } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { StatusActions } from "@/components/appointments/status-actions";
import { AutoRefresh } from "@/components/panel/auto-refresh";
import { requirePermission } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { availableStatusActions, listAgenda, type AppointmentWithRelations } from "@/server/services/appointments";
import { getSystemSetting } from "@/server/services/settings";
import { professionalDisplayName } from "@/server/services/public-site";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { todayISO } from "@/lib/time";
import type { CurrentActor } from "@/server/auth/current";
import type { BookingPolicy } from "@/lib/system-settings";

export const metadata = { title: "Recepción" };

export default async function ReceptionPage() {
  const actor = await requirePermission("recepcion.gestionar");
  const today = todayISO();
  const [appointments, policy] = await Promise.all([listAgenda(actor, { fromISO: today, toISO: today }), getSystemSetting("booking")]);

  const expected = appointments.filter((a) => ["SCHEDULED", "CONFIRMED"].includes(a.status));
  const waiting = appointments
    .filter((a) => a.status === "CHECKED_IN")
    .sort((a, b) => (a.checkedInAt?.getTime() ?? 0) - (b.checkedInAt?.getTime() ?? 0));
  const inCare = appointments.filter((a) => a.status === "IN_PROGRESS");
  const closed = appointments.filter((a) => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(a.status));

  return (
    <div>
      <AutoRefresh seconds={60} />
      <PageHeader
        title="Recepción"
        description={<span className="first-letter:uppercase">{formatLongDate(`${today}T12:00:00Z`)} · se actualiza automáticamente cada minuto</span>}
        actions={
          can(actor, "citas.gestionar") ? (
            <ButtonLink href="/panel/citas/nueva" icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
              Nueva cita
            </ButtonLink>
          ) : null
        }
      />
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Por llegar", expected.length],
          ["En sala de espera", waiting.length],
          ["En atención", inCare.length],
          ["Atendidas / cerradas", closed.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-xs font-medium text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Sala de espera" description="Por orden de llegada" items={waiting} actor={actor} policy={policy} showWaiting empty="No hay pacientes en sala de espera." />
        <Section title="Por llegar" description="Citas programadas y confirmadas de hoy" items={expected} actor={actor} policy={policy} empty="No quedan pacientes por llegar." />
        <Section title="En atención" items={inCare} actor={actor} policy={policy} empty="Ningún paciente en atención en este momento." />
        <Section title="Finalizadas, ausentes y canceladas" items={closed} actor={actor} policy={policy} empty="Todavía no hay citas cerradas hoy." />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  items,
  actor,
  policy,
  empty,
  showWaiting,
}: {
  title: string;
  description?: string;
  items: AppointmentWithRelations[];
  actor: CurrentActor;
  policy: BookingPolicy;
  empty: string;
  showWaiting?: boolean;
}) {
  return (
    <Card>
      <CardHeader title={`${title} (${items.length})`} description={description} />
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((a, idx) => {
            const actions = availableStatusActions(actor, a, policy);
            const name = `${a.patient.firstName} ${a.patient.lastName}`;
            return (
              <li key={a.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      {showWaiting ? <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-900">{idx + 1}</span> : null}
                      <Link href={`/panel/citas/${a.id}`} className="hover:text-primary hover:underline">
                        {name}
                      </Link>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="size-3.5" aria-hidden="true" /> {formatTime(a.startsAt)}
                      </span>
                      <span>{professionalDisplayName(a.professional)}</span>
                      <span>{a.service.name}</span>
                      {a.patient.phone ? (
                        <a href={`tel:${a.patient.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Phone className="size-3.5" aria-hidden="true" /> {a.patient.phone}
                        </a>
                      ) : null}
                    </p>
                    {showWaiting && a.checkedInAt ? <p className="mt-1 text-xs text-amber-800">Llegó a las {formatTime(a.checkedInAt)}</p> : null}
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </div>
                {actions.length ? (
                  <StatusActions appointmentId={a.id} actions={actions} patientName={name} when={formatDateTime(a.startsAt)} isNoShow={a.status === "NO_SHOW"} />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={empty} className="py-8" />
      )}
    </Card>
  );
}
