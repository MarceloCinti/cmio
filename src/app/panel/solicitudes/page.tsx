import { Inbox, MessageCircle, Phone, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { SegmentedLinks } from "@/components/panel/query-controls";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/panel/pagination";
import { RequestStatusForm } from "@/components/panel/request-status-form";
import { requirePermission } from "@/server/auth/current";
import { listContactRequests } from "@/server/services/contact-requests";
import { CONTACT_KIND_LABELS, CONTACT_STATUS_LABELS } from "@/lib/labels";
import { whatsappHref } from "@/lib/site-content";
import { formatDateTime } from "@/lib/format";
import type { ContactStatus } from "@/generated/prisma/client";

export const metadata = { title: "Solicitudes web" };

export default async function RequestsPage({ searchParams }: PageProps<"/panel/solicitudes">) {
  const actor = await requirePermission("solicitudes.gestionar");
  const sp = await searchParams;
  const filter = typeof sp.estado === "string" && ["RESOLVED", "DISCARDED"].includes(sp.estado) ? (sp.estado as ContactStatus) : "OPEN";
  const page = Number(sp.pagina) || 1;
  const data = await listContactRequests(actor, { status: filter, page });
  return (
    <div>
      <PageHeader title="Solicitudes web" description="Pedidos de cita y mensajes enviados desde el sitio. Responde por teléfono o WhatsApp y registra el resultado." />
      <div className="mb-4">
        <SegmentedLinks
          label="Filtrar solicitudes"
          current={filter}
          items={[
            { value: "OPEN", label: "Pendientes", href: "/panel/solicitudes" },
            { value: "RESOLVED", label: "Resueltas", href: "/panel/solicitudes?estado=RESOLVED" },
            { value: "DISCARDED", label: "Descartadas", href: "/panel/solicitudes?estado=DISCARDED" },
          ]}
        />
      </div>
      {data.items.length ? (
        <div className="space-y-4">
          {data.items.map((r) => {
            const wa = whatsappHref(r.phone, `Hola, ${r.fullName.split(" ")[0]}. Te escribimos de la clínica por tu solicitud.`);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
                      {r.fullName}
                      <Badge tone={r.kind === "APPOINTMENT" ? "primary" : "neutral"}>{CONTACT_KIND_LABELS[r.kind]}</Badge>
                      <Badge tone={r.status === "NEW" ? "warning" : r.status === "IN_PROGRESS" ? "info" : "neutral"}>{CONTACT_STATUS_LABELS[r.status]}</Badge>
                    </p>
                    <p className="text-sm text-muted">Recibida el {formatDateTime(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary">
                      <Phone className="size-4" aria-hidden="true" /> {r.phone}
                    </a>
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold hover:border-primary">
                        <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
                      </a>
                    ) : null}
                    <ButtonLink href="/panel/pacientes/nuevo?siguiente=agendar" size="sm" variant="outline" icon={<UserPlus className="size-4" aria-hidden="true" />}>
                      Registrar y agendar
                    </ButtonLink>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  {r.email ? (
                    <div>
                      <dt className="text-muted">Correo</dt>
                      <dd className="text-ink">{r.email}</dd>
                    </div>
                  ) : null}
                  {r.specialty ? (
                    <div>
                      <dt className="text-muted">Especialidad</dt>
                      <dd className="text-ink">{r.specialty.name}</dd>
                    </div>
                  ) : null}
                  {r.preferredSchedule ? (
                    <div>
                      <dt className="text-muted">Preferencia horaria</dt>
                      <dd className="text-ink">{r.preferredSchedule}</dd>
                    </div>
                  ) : null}
                </dl>
                {r.message ? <p className="mt-3 rounded-xl bg-canvas p-3 text-sm whitespace-pre-line text-ink">{r.message}</p> : null}
                <div className="mt-4 border-t border-line pt-4">
                  <RequestStatusForm id={r.id} status={r.status} note={r.internalNote ?? ""} />
                </div>
              </Card>
            );
          })}
          <Card>
            <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/panel/solicitudes" params={{ estado: filter === "OPEN" ? "" : filter }} />
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Inbox className="size-6" aria-hidden="true" />} title="No hay solicitudes en esta lista" description="Las solicitudes del formulario del sitio aparecerán aquí." />
        </Card>
      )}
    </div>
  );
}
