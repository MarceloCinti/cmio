import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { WeeklyScheduleEditor, ExceptionForm } from "@/components/scheduling/schedule-editor";
import { ExceptionList } from "@/components/scheduling/exception-list";
import { requireClinician } from "@/server/auth/current";
import { getProfessionalSchedule } from "@/server/services/schedules";

export const metadata = { title: "Mi disponibilidad" };

export default async function MyAvailabilityPage() {
  const actor = await requireClinician();
  const { rules, exceptions } = await getProfessionalSchedule(actor, actor.professionalId);
  return (
    <div className="space-y-6">
      <PageHeader title="Mi disponibilidad" description="Define tus horarios semanales de atención y registra vacaciones, ausencias o bloqueos." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Horario semanal" description="Hora de Paraguay." />
          <CardBody>
            <WeeklyScheduleEditor professionalId={actor.professionalId} rules={rules} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Registrar ausencia o bloqueo" />
            <CardBody>
              <ExceptionForm professionalId={actor.professionalId} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Próximos bloqueos" />
            <CardBody>
              <ExceptionList items={exceptions} empty="No tienes bloqueos programados." />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
