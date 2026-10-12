import { notFound, redirect } from "next/navigation";
import { requirePatient } from "@/server/auth/current";
import { getAppointmentForActor } from "@/server/services/appointments";
import { getSystemSetting } from "@/server/services/settings";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";
import { ButtonLink } from "@/components/ui/button";
import { RescheduleForm } from "@/components/appointments/reschedule-form";
import { formatDateTime } from "@/lib/format";
import { rescheduleMyAppointmentAction } from "@/app/portal/actions";

export const metadata = { title: "Reprogramar cita" };

export default async function ReschedulePage({ params }: PageProps<"/portal/citas/[id]/reprogramar">) {
  const { id } = await params;
  const actor = await requirePatient();
  const appt = await getAppointmentForActor(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const policy = await getSystemSetting("booking");
  const allowed =
    ["SCHEDULED", "CONFIRMED"].includes(appt.status) &&
    policy.allowPatientReschedule &&
    Date.now() <= appt.startsAt.getTime() - policy.patientRescheduleMinHours * 3600_000;
  if (!allowed) redirect(`/portal/citas/${id}`);
  return (
    <div className="space-y-6">
      <div>
        <ButtonLink href={`/portal/citas/${id}`} variant="ghost" size="sm" className="-ml-3">
          ← Volver a la cita
        </ButtonLink>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Reprogramar cita</h1>
        <p className="mt-1 text-muted">
          {appt.service.name} con {professionalDisplayName(appt.professional)}. Horario actual: {formatDateTime(appt.startsAt)}.
        </p>
      </div>
      <RescheduleForm
        action={rescheduleMyAppointmentAction}
        appointmentId={appt.id}
        professionalId={appt.professionalId}
        serviceId={appt.serviceId}
      />
    </div>
  );
}
