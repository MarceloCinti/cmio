import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { RescheduleForm } from "@/components/appointments/reschedule-form";
import { requirePermission } from "@/server/auth/current";
import { getAppointmentForActor } from "@/server/services/appointments";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";
import { formatDateTime } from "@/lib/format";
import { rescheduleFromPanelAction } from "../../actions";

export const metadata = { title: "Reprogramar cita" };

export default async function PanelReschedulePage({ params }: PageProps<"/panel/citas/[id]/reprogramar">) {
  const { id } = await params;
  const actor = await requirePermission("citas.gestionar");
  const appt = await getAppointmentForActor(actor, id, "manage").catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  if (!["SCHEDULED", "CONFIRMED"].includes(appt.status)) redirect(`/panel/citas/${id}`);
  return (
    <div>
      <PageHeader
        back={{ href: `/panel/citas/${id}`, label: "Volver a la cita" }}
        title="Reprogramar cita"
        description={`${appt.patient.firstName} ${appt.patient.lastName} · ${appt.service.name} con ${professionalDisplayName(appt.professional)} · actual: ${formatDateTime(appt.startsAt)}`}
      />
      <RescheduleForm action={rescheduleFromPanelAction} appointmentId={appt.id} professionalId={appt.professionalId} serviceId={appt.serviceId} staff />
    </div>
  );
}
