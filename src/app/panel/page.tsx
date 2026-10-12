import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardPen, ConciergeBell, Inbox, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/panel/stat-tile";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { StatusActions } from "@/components/appointments/status-actions";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { availableStatusActions, listAgenda } from "@/server/services/appointments";
import { getOperationalReport, getSetupChecklist } from "@/server/services/reports";
import { getSystemSetting } from "@/server/services/settings";
import { countOpenContactRequests } from "@/server/services/contact-requests";
import { emailStatus } from "@/server/integrations/email";
import { whatsappStatus } from "@/server/integrations/whatsapp";
import { db } from "@/server/db";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { startOfMonthISO, todayISO } from "@/lib/time";

export const metadata = { title: "Inicio" };

export default async function PanelHome() {
  const actor = await requireStaff();
  const today = todayISO();
  const policy = await getSystemSetting("booking");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Asuncion" }).format(new Date()));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const [myToday, drafts, todayAll, openRequests, report, checklist] = await Promise.all([
    actor.professionalId ? listAgenda(actor, { fromISO: today, toISO: today, professionalId: actor.professionalId }) : Promise.resolve([]),
    actor.professionalId
      ? db.encounter.findMany({
          where: { professionalId: actor.professionalId, status: "DRAFT" },
          select: { id: true, reason: true, startedAt: true, patient: { select: { firstName: true, lastName: true } } },
          orderBy: { startedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    can(actor, "recepcion.gestionar") || can(actor, "agenda.ver_todas") ? listAgenda(actor, { fromISO: today, toISO: today }) : Promise.resolve([]),
    can(actor, "solicitudes.gestionar") ? countOpenContactRequests() : Promise.resolve(0),
    can(actor, "informes.ver") ? getOperationalReport(actor, { fromISO: startOfMonthISO(today), toISO: today }) : Promise.resolve(null),
    actor.role === "OWNER" || actor.role === "ADMIN" ? getSetupChecklist() : Promise.resolve(null),
  ]);
  const myActive = myToday.filter((a) => !["CANCELLED"].includes(a.status));
  const counts = {
    expected: todayAll.filter((a) => ["SCHEDULED", "CONFIRMED"].includes(a.status)).length,
    waiting: todayAll.filter((a) => a.status === "CHECKED_IN").length,
    done: todayAll.filter((a) => a.status === "COMPLETED").length,
    total: todayAll.filter((a) => a.status !== "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting}, ${actor.name.split(" ")[0]}`} description={<span className="first-letter:uppercase">{formatLongDate(`${today}T12:00:00Z`)}</span>} />

      {checklist ? <SetupChecklist c={checklist} /> : null}

      {can(actor, "recepcion.gestionar") || can(actor, "agenda.ver_todas") ? (
        <section aria-labelledby="hoy" className="space-y-3">
          <h2 id="hoy" className="text-lg font-semibold text-ink">
            Hoy en la clínica
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Citas del día" value={counts.total} href="/panel/agenda" icon={<CalendarDays className="size-5" aria-hidden="true" />} />
            <StatTile label="Por llegar" value={counts.expected} href={can(actor, "recepcion.gestionar") ? "/panel/recepcion" : undefined} icon={<ConciergeBell className="size-5" aria-hidden="true" />} />
            <StatTile label="En sala de espera" value={counts.waiting} href={can(actor, "recepcion.gestionar") ? "/panel/recepcion" : undefined} icon={<UsersRound className="size-5" aria-hidden="true" />} />
            {can(actor, "solicitudes.gestionar") ? (
              <StatTile label="Solicitudes web nuevas" value={openRequests} href="/panel/solicitudes" icon={<Inbox className="size-5" aria-hidden="true" />} />
            ) : (
              <StatTile label="Atendidas" value={counts.done} icon={<CheckCircle2 className="size-5" aria-hidden="true" />} />
            )}
          </div>
        </section>
      ) : null}

      {actor.professionalId ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader
              title="Tus pacientes de hoy"
              description={`${myActive.length} cita(s)`}
              actions={
                <Link href="/panel/agenda" className="text-sm font-semibold text-primary hover:underline">
                  Ver agenda
                </Link>
              }
            />
            {myActive.length ? (
              <ul className="divide-y divide-line">
                {myActive.map((a) => {
                  const actions = availableStatusActions(actor, a, policy).filter((s) => s !== "CANCELLED");
                  const name = `${a.patient.firstName} ${a.patient.lastName}`;
                  return (
                    <li key={a.id} className="space-y-2 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Link href={`/panel/citas/${a.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                            <span className="tabular-nums">{formatTime(a.startsAt)}</span> · {name}
                          </Link>
                          <p className="text-sm text-muted">{a.service.name}</p>
                        </div>
                        <AppointmentStatusBadge status={a.status} />
                      </div>
                      {actions.length ? <StatusActions appointmentId={a.id} actions={actions} patientName={name} when={formatDateTime(a.startsAt)} /> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No tienes citas para hoy" description="Revisa tu agenda para ver los próximos días." />
            )}
          </Card>
          <Card>
            <CardHeader title="Consultas en borrador" description="Finalízalas para que el registro quede completo." />
            {drafts.length ? (
              <ul className="divide-y divide-line">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/panel/consultas/${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-primary-soft/40">
                      <ClipboardPen className="size-5 text-primary" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {d.patient.firstName} {d.patient.lastName}
                        </span>
                        <span className="block text-xs text-muted">
                          {d.reason} · {formatDateTime(d.startedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No hay consultas pendientes de finalizar" className="py-8" />
            )}
          </Card>
        </div>
      ) : null}

      {report ? (
        <section aria-labelledby="mes" className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 id="mes" className="text-lg font-semibold text-ink">
              Este mes
            </h2>
            <Link href="/panel/informes" className="text-sm font-semibold text-primary hover:underline">
              Ver informes
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Citas registradas" value={report.total} hint={`${report.fromPortal} desde el portal`} />
            <StatTile label="Pacientes atendidos" value={report.completed} />
            <StatTile label="Ocupación de agendas" value={report.occupancy === null ? "—" : `${report.occupancy}%`} hint={report.occupancy === null ? "Sin disponibilidad configurada" : "Hasta hoy"} />
            <StatTile label="Nuevos pacientes" value={report.newPatients} />
          </div>
        </section>
      ) : null}

      {!actor.professionalId && !can(actor, "recepcion.gestionar") && !report ? (
        <Card>
          <EmptyState title="Bienvenido al panel" description="Usa el menú para acceder a las secciones habilitadas para tu rol." />
        </Card>
      ) : null}
    </div>
  );
}

function SetupChecklist({ c }: { c: Awaited<ReturnType<typeof getSetupChecklist>> }) {
  const email = emailStatus();
  const wa = whatsappStatus();
  const items = [
    { ok: c.contactVerified, text: "Verificar teléfonos, dirección, horarios y WhatsApp de la clínica", href: "/panel/contenido?seccion=institucion" },
    { ok: c.legalReviewed, text: "Revisar con asesoría legal la política de privacidad, términos y aviso de datos", href: "/panel/contenido?seccion=legal" },
    { ok: c.provisionalBlocks === 0, text: `Revisar los textos institucionales provisionales (${c.provisionalBlocks})`, href: "/panel/contenido?seccion=clinica" },
    { ok: c.pendingServices === 0, text: `Confirmar los servicios y estudios que ofrece la clínica (${c.pendingServices} pendientes)`, href: "/panel/servicios" },
    { ok: c.draftPros === 0, text: `Completar perfiles profesionales pendientes (${c.draftPros})`, href: "/panel/profesionales" },
    { ok: c.prosWithoutSchedule === 0, text: `Configurar la disponibilidad de profesionales activos (${c.prosWithoutSchedule} sin horarios)`, href: "/panel/profesionales" },
    { ok: email.configured && email.driver === "smtp", text: "Configurar el envío de correos (SMTP)", href: "/panel/configuracion" },
    { ok: wa.configured, text: "Configurar WhatsApp Business (opcional)", href: "/panel/configuracion" },
  ];
  const pending = items.filter((i) => !i.ok);
  if (!pending.length) return null;
  return (
    <Card className="border-amber-200">
      <CardHeader title="Pendientes antes de operar en producción" description={`${items.length - pending.length} de ${items.length} completados`} />
      <CardBody>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.text} className="flex items-start gap-2 text-sm">
              {i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />}
              <span className={i.ok ? "text-muted line-through" : "text-ink"}>
                {i.ok ? i.text : <Link href={i.href} className="hover:text-primary hover:underline">{i.text}</Link>}
                <span className="sr-only">{i.ok ? " (completado)" : " (pendiente)"}</span>
              </span>
            </li>
          ))}
        </ul>
        <ButtonLink href="/panel/configuracion" variant="ghost" size="sm" className="mt-3 -ml-3">
          Ver estado de integraciones
        </ButtonLink>
      </CardBody>
    </Card>
  );
}
