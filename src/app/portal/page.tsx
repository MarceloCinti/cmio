import Link from "next/link";
import { CalendarDays, CalendarPlus, ChevronRight, ClipboardList, FileText, LineChart, MapPin, UserRound } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { requirePatient } from "@/server/auth/current";
import { db } from "@/server/db";
import { listNotifications } from "@/server/services/notifications";
import { getSystemSetting, getSiteContent } from "@/server/services/settings";
import { professionalDisplayName } from "@/server/services/public-site";
import { nextActiveAppointmentWhere } from "@/server/services/appointments";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { confirmMyAppointmentAction } from "./actions";

export const metadata = { title: "Inicio" };

export default async function PortalHome() {
  const actor = await requirePatient();
  const [next, policy, { institution }, notifications, newDocs, sharedInstructions, patient] = await Promise.all([
    db.appointment.findFirst({
      where: nextActiveAppointmentWhere(actor.patientId),
      orderBy: { startsAt: "asc" },
      include: { professional: true, service: true },
    }),
    getSystemSetting("booking"),
    getSiteContent("published"),
    listNotifications(actor, 4),
    db.clinicalDocument.count({ where: { patientId: actor.patientId, status: "PUBLISHED", publishedAt: { gt: new Date(Date.now() - 30 * 86400_000) } } }),
    db.encounter.findFirst({
      where: { patientId: actor.patientId, status: "FINALIZED", sharePatientInstructions: true, patientInstructions: { not: null } },
      orderBy: { finalizedAt: "desc" },
      select: { patientInstructions: true, finalizedAt: true, professional: { select: { honorific: true, firstName: true, lastName: true } } },
    }),
    db.patient.findUnique({ where: { id: actor.patientId }, select: { firstName: true, portalProgressEnabled: true } }),
  ]);
  const canConfirm =
    next && next.status === "SCHEDULED" && Date.now() >= next.startsAt.getTime() - policy.confirmWindowHours * 3600_000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Hola, {patient?.firstName ?? actor.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">Desde aquí gestionas tus citas y consultas la información que tu equipo de salud compartió contigo.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-primary-soft px-5 py-3">
          <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">Tu próxima cita</h2>
        </div>
        {next ? (
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-bold text-ink first-letter:uppercase">{formatLongDate(next.startsAt)}</p>
                <p className="text-lg text-ink">a las {formatTime(next.startsAt)}</p>
              </div>
              <AppointmentStatusBadge status={next.status} />
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Profesional</dt>
                <dd className="font-medium text-ink">{professionalDisplayName(next.professional)}</dd>
              </div>
              <div>
                <dt className="text-muted">Servicio</dt>
                <dd className="font-medium text-ink">{next.service.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Lugar</dt>
                <dd className="flex items-start gap-1.5 font-medium text-ink">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {institution.address}, {institution.addressReference}, {institution.city}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {canConfirm ? (
                <ConfirmAction
                  action={confirmMyAppointmentAction}
                  fields={{ appointmentId: next.id }}
                  title="Confirmar asistencia"
                  description={`¿Confirmas que asistirás el ${formatDateTime(next.startsAt)}?`}
                  confirmLabel="Sí, asistiré"
                  triggerLabel="Confirmar asistencia"
                  triggerVariant="secondary"
                  triggerSize="md"
                />
              ) : null}
              <ButtonLink href={`/portal/citas/${next.id}`} variant="outline">
                Ver detalle, cancelar o reprogramar
              </ButtonLink>
            </div>
          </CardBody>
        ) : (
          <EmptyState
            icon={<CalendarDays className="size-6" aria-hidden="true" />}
            title="No tienes citas próximas"
            description="Elige especialidad, profesional y horario según la disponibilidad real de la agenda."
            action={
              <ButtonLink href="/portal/citas/nueva" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
                Agendar una consulta
              </ButtonLink>
            }
          />
        )}
      </Card>

      {next ? (
        <ButtonLink href="/portal/citas/nueva" size="lg" className="w-full sm:w-auto" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
          Agendar una nueva consulta
        </ButtonLink>
      ) : null}

      {sharedInstructions?.patientInstructions ? (
        <Card>
          <CardHeader
            title="Indicaciones de tu última consulta"
            description={`${professionalDisplayName(sharedInstructions.professional)} · ${sharedInstructions.finalizedAt ? formatLongDate(sharedInstructions.finalizedAt) : ""}`}
          />
          <CardBody>
            <p className="leading-relaxed whitespace-pre-line text-ink">{sharedInstructions.patientInstructions}</p>
          </CardBody>
        </Card>
      ) : null}

      <section aria-labelledby="accesos">
        <h2 id="accesos" className="sr-only">
          Accesos rápidos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/portal/citas", label: "Mis citas", desc: "Próximas e historial", icon: ClipboardList },
            { href: "/portal/documentos", label: "Documentos", desc: newDocs ? `${newDocs} nuevo(s) este mes` : "Resultados e informes", icon: FileText },
            ...(patient?.portalProgressEnabled ? [{ href: "/portal/seguimiento", label: "Seguimiento", desc: "Tu evolución", icon: LineChart }] : []),
            { href: "/portal/perfil", label: "Mi perfil", desc: "Datos y preferencias", icon: UserRound },
          ].map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <i.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{i.label}</span>
                  <span className="block text-sm text-muted">{i.desc}</span>
                </span>
                <ChevronRight className="size-5 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {notifications.length ? (
        <Card>
          <CardHeader
            title="Notificaciones recientes"
            actions={
              <Link href="/portal/notificaciones" className="text-sm font-semibold text-primary hover:underline">
                Ver todas
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="text-sm text-muted">{n.body}</p>
                </div>
                <span className="text-xs whitespace-nowrap text-muted">{formatDateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
