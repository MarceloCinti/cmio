import { notFound } from "next/navigation";
import { CalendarClock, Clock, MapPin, Stethoscope, UserRound } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { AppointmentTimeline } from "@/components/appointments/timeline";
import { requirePatient } from "@/server/auth/current";
import { getAppointmentEvents, getAppointmentForActor } from "@/server/services/appointments";
import { getSiteContent, getSystemSetting } from "@/server/services/settings";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { cancelMyAppointmentAction, confirmMyAppointmentAction } from "../../actions";

export const metadata = { title: "Detalle de la cita" };

export default async function MyAppointmentPage({ params, searchParams }: PageProps<"/portal/citas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requirePatient();
  const appt = await getAppointmentForActor(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [events, policy, { institution }] = await Promise.all([getAppointmentEvents(actor, id), getSystemSetting("booking"), getSiteContent("published")]);
  const now = Date.now();
  const start = appt.startsAt.getTime();
  const open = ["SCHEDULED", "CONFIRMED"].includes(appt.status) && start > now;
  const canConfirm = appt.status === "SCHEDULED" && open && now >= start - policy.confirmWindowHours * 3600_000;
  const canCancel = open && now <= start - policy.patientCancelMinHours * 3600_000;
  const canReschedule = open && policy.allowPatientReschedule && now <= start - policy.patientRescheduleMinHours * 3600_000;
  const phone = institution.phones[0]?.number;

  return (
    <div className="space-y-6">
      {sp.nueva === "1" ? (
        <Alert tone="success" title="¡Tu cita quedó agendada!" live>
          Te enviamos la confirmación por los medios que autorizaste. Código de la cita: <strong>{appt.code}</strong>.
        </Alert>
      ) : null}
      {sp.reprogramada === "1" ? (
        <Alert tone="success" title="Tu cita fue reprogramada" live>
          El nuevo horario quedó registrado.
        </Alert>
      ) : null}

      <div>
        <ButtonLink href="/portal/citas" variant="ghost" size="sm" className="-ml-3">
          ← Mis citas
        </ButtonLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{appt.service.name}</h1>
          <AppointmentStatusBadge status={appt.status} />
        </div>
        <p className="mt-1 text-sm text-muted">Código de la cita: {appt.code}</p>
      </div>

      <Card>
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info icon={CalendarClock} label="Fecha">
              <span className="first-letter:uppercase">{formatLongDate(appt.startsAt)}</span>
            </Info>
            <Info icon={Clock} label="Hora">
              {formatTime(appt.startsAt)} a {formatTime(appt.endsAt)}
            </Info>
            <Info icon={UserRound} label="Profesional">
              {professionalDisplayName(appt.professional)}
            </Info>
            <Info icon={Stethoscope} label="Servicio">
              {appt.service.name}
            </Info>
            <Info icon={MapPin} label="Lugar">
              {institution.address}, {institution.addressReference}, {institution.city}
            </Info>
          </dl>
          {appt.status === "CANCELLED" && appt.cancellationReason ? (
            <p className="mt-4 rounded-xl bg-canvas p-3 text-sm text-muted">Motivo de la cancelación: {appt.cancellationReason}</p>
          ) : null}
        </CardBody>
      </Card>

      {open ? (
        <Card>
          <CardHeader title="Gestionar la cita" description={policy.cancellationPolicyText} />
          <CardBody className="flex flex-wrap gap-2">
            {canConfirm ? (
              <ConfirmAction
                action={confirmMyAppointmentAction}
                fields={{ appointmentId: appt.id }}
                title="Confirmar asistencia"
                description={`¿Confirmas que asistirás el ${formatDateTime(appt.startsAt)}?`}
                confirmLabel="Sí, asistiré"
                triggerLabel="Confirmar asistencia"
                triggerVariant="secondary"
                triggerSize="md"
              />
            ) : appt.status === "SCHEDULED" ? (
              <p className="w-full text-sm text-muted">Podrás confirmar tu asistencia desde {policy.confirmWindowHours} horas antes de la cita.</p>
            ) : null}
            {canReschedule ? (
              <ButtonLink href={`/portal/citas/${appt.id}/reprogramar`} variant="outline">
                Reprogramar
              </ButtonLink>
            ) : null}
            {canCancel ? (
              <ConfirmAction
                action={cancelMyAppointmentAction}
                fields={{ appointmentId: appt.id }}
                title="Cancelar la cita"
                description={`Se cancelará tu cita del ${formatDateTime(appt.startsAt)} y el horario quedará disponible para otra persona. Esta acción no se puede deshacer.`}
                confirmLabel="Sí, cancelar la cita"
                cancelLabel="No, mantener"
                triggerLabel="Cancelar la cita"
                triggerVariant="outline"
                triggerSize="md"
                destructive
                reasonLabel="Motivo (opcional)"
              />
            ) : null}
            {!canCancel ? (
              <p className="w-full text-sm text-muted">
                El plazo para cancelar o reprogramar en línea ya venció. Si necesitas hacerlo, comunícate con la secretaría{phone ? ` al ${phone}` : ""}.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Historial de la cita" />
        <CardBody>
          <AppointmentTimeline events={events} />
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}
