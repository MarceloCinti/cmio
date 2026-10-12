import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ExceptionForm } from "@/components/scheduling/schedule-editor";
import { ExceptionList } from "@/components/scheduling/exception-list";
import { requirePermission } from "@/server/auth/current";
import { listClinicClosures } from "@/server/services/schedules";

export const metadata = { title: "Feriados y cierres" };

export default async function HolidaysPage() {
  const actor = await requirePermission("horarios.gestionar");
  const items = await listClinicClosures(actor);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Feriados y cierres"
        description="Días no laborables de toda la clínica. Bloquean la agenda de todos los profesionales. Verifica cada año los feriados oficiales, ya que algunos se trasladan por decreto."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Registrar feriado o cierre" />
          <CardBody>
            <ExceptionForm clinicWide />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Próximos feriados y cierres" />
          <CardBody>
            <ExceptionList items={items} empty="No hay feriados ni cierres registrados." />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
