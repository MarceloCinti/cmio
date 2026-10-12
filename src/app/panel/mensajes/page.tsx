import { PageHeader } from "@/components/panel/page-header";
import { SegmentedLinks } from "@/components/panel/query-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/confirm-action";
import { Pagination } from "@/components/panel/pagination";
import { TemplateForm } from "@/components/panel/template-form";
import { requirePermission } from "@/server/auth/current";
import { listOutboundMessages, listTemplates } from "@/server/services/messages-admin";
import { MESSAGE_EVENT_LABELS, SECURITY_EVENTS, TEMPLATE_VARIABLES, type MessageEventKey } from "@/lib/message-templates";
import { DELIVERY_STATUS_LABELS, MESSAGE_SKIP_REASONS, MESSAGE_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { MessageStatus } from "@/generated/prisma/client";
import { retryMessageAction } from "../admin-actions";

export const metadata = { title: "Mensajes y plantillas" };

function maskRecipient(r: string) {
  if (r.includes("@")) {
    const [u, d] = r.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  return r.length > 4 ? `${"*".repeat(Math.max(0, r.length - 4))}${r.slice(-4)}` : r;
}

export default async function MessagesPage({ searchParams }: PageProps<"/panel/mensajes">) {
  const actor = await requirePermission("mensajes.gestionar");
  const sp = await searchParams;
  const tab = sp.vista === "plantillas" ? "plantillas" : "registro";
  const status = typeof sp.estado === "string" && ["PENDING", "SENT", "FAILED", "SKIPPED"].includes(sp.estado) ? (sp.estado as MessageStatus) : undefined;
  return (
    <div className="space-y-6">
      <PageHeader title="Mensajes y plantillas" description="Registro de envíos por correo y WhatsApp, con su estado. Los mensajes nunca incluyen información clínica." />
      <SegmentedLinks
        label="Secciones"
        current={tab}
        items={[
          { value: "registro", label: "Registro de envíos", href: "/panel/mensajes" },
          { value: "plantillas", label: "Plantillas", href: "/panel/mensajes?vista=plantillas" },
        ]}
      />
      {tab === "registro" ? <Log status={status} page={Number(sp.pagina) || 1} actorP={actor} /> : <Templates actorP={actor} />}
    </div>
  );
}

async function Log({ status, page, actorP }: { status?: MessageStatus; page: number; actorP: Awaited<ReturnType<typeof requirePermission>> }) {
  const data = await listOutboundMessages(actorP, { status, page });
  return (
    <div className="space-y-4">
      <SegmentedLinks
        label="Filtrar por estado"
        current={status ?? "ALL"}
        items={[
          { value: "ALL", label: "Todos", href: "/panel/mensajes" },
          ...(["PENDING", "SENT", "FAILED", "SKIPPED"] as const).map((s) => ({ value: s, label: `${MESSAGE_STATUS_LABELS[s]} (${data.counts[s] ?? 0})`, href: `/panel/mensajes?estado=${s}` })),
        ]}
      />
      <Card>
        {data.items.length ? (
          <ul className="divide-y divide-line">
            {data.items.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {MESSAGE_EVENT_LABELS[m.event as MessageEventKey]} · {m.channel === "EMAIL" ? "Correo" : "WhatsApp"} · {maskRecipient(m.recipient)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(m.createdAt)} · intentos: {m.attempts}
                    {m.sentAt ? ` · enviado ${formatDateTime(m.sentAt)}` : ""}
                    {m.skipReason ? ` · ${MESSAGE_SKIP_REASONS[m.skipReason] ?? m.skipReason}` : ""}
                    {m.deliveryStatus ? ` · proveedor: ${DELIVERY_STATUS_LABELS[m.deliveryStatus] ?? m.deliveryStatus}` : ""}
                  </p>
                  {m.lastError ? <p className="mt-1 text-xs break-words text-red-800">{m.lastError}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.status === "SENT" ? "success" : m.status === "FAILED" ? "danger" : m.status === "PENDING" ? "info" : "neutral"}>{MESSAGE_STATUS_LABELS[m.status]}</Badge>
                  {(m.status === "FAILED" || m.status === "SKIPPED") && !SECURITY_EVENTS.includes(m.event as MessageEventKey) ? (
                    <ActionButton action={retryMessageAction} fields={{ id: m.id }} size="sm">
                      Reintentar
                    </ActionButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No hay mensajes registrados" />
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/panel/mensajes" params={{ estado: status ?? "" }} />
      </Card>
    </div>
  );
}

async function Templates({ actorP }: { actorP: Awaited<ReturnType<typeof requirePermission>> }) {
  const templates = await listTemplates(actorP);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader title="Plantillas" />
        <ul className="divide-y divide-line">
          {templates.map((t) => (
            <li key={t.id} className="px-5 py-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">{MESSAGE_EVENT_LABELS[t.event as MessageEventKey]}</span>
                  <span className="flex gap-1.5">
                    <Badge tone={t.channel === "EMAIL" ? "info" : "success"}>{t.channel === "EMAIL" ? "Correo" : "WhatsApp"}</Badge>
                    {!t.isActive ? <Badge>Inactiva</Badge> : null}
                  </span>
                </summary>
                <div className="mt-4">
                  <TemplateForm t={t} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Variables disponibles" />
        <CardBody>
          <dl className="space-y-2 text-sm">
            {Object.entries(TEMPLATE_VARIABLES).map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-xs text-primary">{`{{${k}}}`}</dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
