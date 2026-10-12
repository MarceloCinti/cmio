import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ProfessionalForm } from "@/components/catalog/catalog-forms";
import { WeeklyScheduleEditor, ExceptionForm } from "@/components/scheduling/schedule-editor";
import { ExceptionList } from "@/components/scheduling/exception-list";
import { requirePermission } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getProfessionalAdmin } from "@/server/services/catalog";
import { getProfessionalSchedule } from "@/server/services/schedules";
import { professionalFormOptions } from "@/server/services/professional-form-data";
import { professionalDisplayName } from "@/server/services/public-site";
import { NotFoundError } from "@/server/errors";

export const metadata = { title: "Perfil profesional" };

export default async function ProfessionalAdminPage({ params, searchParams }: PageProps<"/panel/profesionales/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requirePermission("catalogo.gestionar");
  const p = await getProfessionalAdmin(actor, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [opts, schedule] = await Promise.all([
    professionalFormOptions(p.userId),
    can(actor, "horarios.gestionar") ? getProfessionalSchedule(actor, id) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-6">
      {sp.nuevo === "1" ? <Alert tone="success" live title="Perfil creado">Configura ahora su disponibilidad semanal.</Alert> : null}
      <PageHeader back={{ href: "/panel/profesionales", label: "Profesionales" }} title={professionalDisplayName(p)} />
      <div className="grid gap-6 2xl:grid-cols-[1.3fr_1fr]">
        <ProfessionalForm
          p={{
            ...p,
            credentialsVerified: Boolean(p.credentialsVerifiedAt),
            specialtyIds: p.specialties.map((s) => s.specialtyId),
            serviceIds: p.services.map((s) => s.serviceId),
          }}
          specialties={opts.specialties}
          services={opts.services}
          users={opts.users}
        />
        {schedule ? (
          <div className="space-y-6">
            <Card>
              <CardHeader title="Disponibilidad semanal" description="Hora de Paraguay." />
              <CardBody>
                <WeeklyScheduleEditor professionalId={id} rules={schedule.rules} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Vacaciones, ausencias y bloqueos" />
              <CardBody className="space-y-5">
                <ExceptionForm professionalId={id} />
                <ExceptionList items={schedule.exceptions} empty="No hay bloqueos programados." />
              </CardBody>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
