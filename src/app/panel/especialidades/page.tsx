import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { SpecialtyForm } from "@/components/catalog/catalog-forms";
import { requirePermission } from "@/server/auth/current";
import { listSpecialtiesAdmin } from "@/server/services/catalog";
import { deleteSpecialtyAction } from "../admin-actions";

export const metadata = { title: "Especialidades" };

export default async function SpecialtiesAdminPage() {
  const actor = await requirePermission("catalogo.gestionar");
  const items = await listSpecialtiesAdmin(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Especialidades" description="Agrega, edita, oculta o elimina especialidades sin modificar el código." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={`Especialidades (${items.length})`} />
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold text-ink">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {s._count.services} servicio(s) · {s._count.professionals} profesional(es)
                      </span>
                    </span>
                    {s.isPublished ? <Badge tone="success">Visible</Badge> : <Badge>Oculta</Badge>}
                  </summary>
                  <div className="mt-4 space-y-4">
                    <SpecialtyForm s={s} />
                    <ConfirmAction
                      action={deleteSpecialtyAction}
                      fields={{ id: s.id }}
                      title="Eliminar especialidad"
                      description={`Se eliminará «${s.name}». Si tiene citas asociadas no podrá eliminarse; en ese caso, ocúltala.`}
                      confirmLabel="Eliminar"
                      triggerLabel="Eliminar especialidad"
                      destructive
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Nueva especialidad" />
          <CardBody>
            <SpecialtyForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
