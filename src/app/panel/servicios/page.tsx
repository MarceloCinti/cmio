import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ServiceForm } from "@/components/catalog/catalog-forms";
import { requirePermission } from "@/server/auth/current";
import { listServicesAdmin } from "@/server/services/catalog";
import { db } from "@/server/db";
import { SERVICE_CATEGORY_LABELS } from "@/lib/labels";
import { formatGuaranies } from "@/lib/format";
import { deleteServiceAction } from "../admin-actions";

export const metadata = { title: "Servicios" };

export default async function ServicesAdminPage() {
  const actor = await requirePermission("catalogo.gestionar");
  const [items, specialties] = await Promise.all([listServicesAdmin(actor), db.specialty.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })]);
  const pending = items.filter((s) => !s.availabilityConfirmed).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Servicios y estudios" description="Duración, precio, capacidad, disponibilidad y publicación de cada servicio." />
      {pending ? (
        <Alert tone="warning" title={`${pending} servicio(s) pendientes de confirmación`}>
          No se muestran en el sitio ni pueden agendarse en línea hasta que confirmes que la clínica efectivamente los ofrece.
        </Alert>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={`Servicios (${items.length})`} />
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold text-ink">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {SERVICE_CATEGORY_LABELS[s.category]} · {s.durationMinutes} min{s.specialty ? ` · ${s.specialty.name}` : ""}
                        {s.price != null ? ` · ${formatGuaranies(s.price)}` : ""} · {s._count.professionals} profesional(es)
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {s.availabilityConfirmed ? <Badge tone="success">Confirmado</Badge> : <Badge tone="warning">Pendiente de confirmación</Badge>}
                      {s.isPublished ? <Badge tone="primary">Publicado</Badge> : <Badge>No publicado</Badge>}
                      {s.bookableOnline ? <Badge tone="info">Reserva en línea</Badge> : null}
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <ServiceForm s={s} specialties={specialties} />
                    {s._count.appointments === 0 ? (
                      <ConfirmAction
                        action={deleteServiceAction}
                        fields={{ id: s.id }}
                        title="Eliminar servicio"
                        description={`Se eliminará «${s.name}».`}
                        confirmLabel="Eliminar"
                        triggerLabel="Eliminar servicio"
                        destructive
                      />
                    ) : (
                      <p className="text-xs text-muted">Tiene {s._count.appointments} cita(s) registradas: para retirarlo, despublícalo.</p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Nuevo servicio" />
          <CardBody>
            <ServiceForm specialties={specialties} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
