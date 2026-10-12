import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardPen, Stethoscope, UserRound } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { StatusActions } from "@/components/appointments/status-actions";
import { AppointmentTimeline } from "@/components/appointments/timeline";
import { NotesForm } from "@/components/appointments/notes-form";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { availableStatusActions, getAppointmentEvents, getAppointmentForActor } from "@/server/services/appointments";
import { getSystemSetting } from "@/server/services/settings";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";
import { db } from "@/server/db";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";

export const metadata = { title: "Cita" };

export default async function PanelAppointmentPage({ params, searchParams }: PageProps<"/panel/citas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const appt = await getAppointmentForActor(actor, id, "view").catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [events, policy, encounter, messages] = await Promise.all([
    getAppointmentEvents(actor, id),
    getSystemSetting("booking"),
    actor.professionalId === appt.professionalId ? db.encounter.findUnique({ where: { appointmentId: id }, select: { id: true, status: true } }) : null,
    can(actor, "mensajes.gestionar") || can(actor, "citas.gestionar")
      ? db.outboundMessage.findMany({ where: { appointmentId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, channel: true, event: true, status: true, skipReason: true, createdAt: true } })
      : [],
  ]);
  const actions = availableStatusActions(actor, appt, policy);
  const name = `${appt.patient.firstName} ${appt.patient.lastName}`;
  const canReschedule = can(actor, "citas.gestionar") && ["SCHEDULED", "CONFIRMED"].includes(appt.status);
  const isOwnPro = actor.professionalId === appt.professionalId;

  return (
    <div className="space-y-6">
      {sp.nueva === "1" ? <Alert tone="success" live title="Cita agendada">Código {appt.code}. Se notificó al paciente por los canales autorizados.</Alert> : null}
      {sp.reprogramada === "1" ? <Alert tone="success" live title="Cita reprogramada">El paciente fue notificado del nuevo horario.</Alert> : null}
      <PageHeader
        back={{ href: "/panel/agenda", label: "Agenda" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name} <AppointmentStatusBadge status={appt.status} />
            {appt.isOverbook ? <Badge tone="warning">Sobreturno</Badge> : null}
          </span>
        }
        description={`Código ${appt.code} · ${appt.source === "PORTAL" ? "Agendada desde el portal" : "Agendada por el personal"}`}
        actions={
          <>
            {canReschedule ? (
              <ButtonLink href={`/panel/citas/${id}/reprogramar`} variant="outline" size="sm">
                Reprogramar
              </ButtonLink>
            ) : null}
            {isOwnPro && encounter ? (
              <ButtonLink href={`/panel/consultas/${encounter.id}`} size="sm" variant="secondary" icon={<ClipboardPen className="size-4" aria-hidden="true" />}>
                {encounter.status === "DRAFT" ? "Continuar registro clínico" : "Ver registro clínico"}
              </ButtonLink>
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Item icon={CalendarClock} label="Fecha y hora">
                <span className="first-letter:uppercase">{formatLongDate(appt.startsAt)}</span>, {formatTime(appt.startsAt)} a {formatTime(appt.endsAt)}
              </Item>
              <Item icon={UserRound} label="Paciente">
                <Link href={`/panel/pacientes/${appt.patientId}`} className="text-primary hover:underline">
                  {name}
                </Link>
                {appt.patient.phone ? <span className="block text-sm text-muted">{appt.patient.phone}</span> : null}
              </Item>
              <Item icon={Stethoscope} label="Profesional">
                {professionalDisplayName(appt.professional)}
              </Item>
              <Item icon={Stethoscope} label="Servicio">
                {appt.service.name} ({appt.service.durationMinutes} min)
              </Item>
            </CardBody>
            {actions.length ? (
              <div className="border-t border-line px-5 py-4">
                <p className="mb-3 text-sm font-medium text-ink">Acciones</p>
                <StatusActions appointmentId={appt.id} actions={actions} patientName={name} when={formatDateTime(appt.startsAt)} size="md" isNoShow={appt.status === "NO_SHOW"} />
                {isOwnPro && actions.includes("IN_PROGRESS") ? (
                  <p className="mt-2 text-xs text-muted">Al iniciar la consulta se abre el registro clínico.</p>
                ) : null}
              </div>
            ) : null}
            {appt.cancellationReason ? <p className="border-t border-line px-5 py-3 text-sm text-muted">Motivo de cancelación: {appt.cancellationReason}</p> : null}
          </Card>
          {appt.patientComment ? (
            <Card>
              <CardHeader title="Comentario del paciente" />
              <CardBody>
                <p className="text-sm whitespace-pre-line text-ink">{appt.patientComment}</p>
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Observaciones administrativas" description="Notas internas no clínicas. No las ve el paciente." />
            <CardBody>
              {can(actor, "citas.gestionar") || can(actor, "recepcion.gestionar") ? (
                <NotesForm appointmentId={appt.id} defaultValue={appt.adminNotes ?? ""} />
              ) : (
                <p className="text-sm text-muted">{appt.adminNotes || "Sin observaciones."}</p>
              )}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Historial de cambios" />
            <CardBody>
              <AppointmentTimeline events={events} />
            </CardBody>
          </Card>
          {messages.length ? (
            <Card>
              <CardHeader title="Avisos enviados al paciente" />
              <ul className="divide-y divide-line text-sm">
                {messages.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                    <span>
                      {m.channel === "EMAIL" ? "Correo" : "WhatsApp"} · <span className="text-muted">{formatDateTime(m.createdAt)}</span>
                    </span>
                    <Badge tone={m.status === "SENT" ? "success" : m.status === "FAILED" ? "danger" : m.status === "PENDING" ? "info" : "neutral"}>
                      {m.status === "SENT" ? "Enviado" : m.status === "FAILED" ? "Fallido" : m.status === "PENDING" ? "En cola" : "No enviado"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Item({ icon: Icon, label, children }: { icon: typeof UserRound; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <div className="font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}
