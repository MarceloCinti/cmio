import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/form";
import { Pagination } from "@/components/panel/pagination";
import { requirePermission } from "@/server/auth/current";
import { AUDIT_ACTION_GROUPS, listAuditLogs } from "@/server/services/audit-log";
import { ROLE_LABELS } from "@/lib/permissions";
import { addDaysISO, isValidISODate, todayISO } from "@/lib/time";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Auditoría" };

export default async function AuditPage({ searchParams }: PageProps<"/panel/auditoria">) {
  const actor = await requirePermission("auditoria.ver");
  const sp = await searchParams;
  const today = todayISO();
  const from = typeof sp.desde === "string" && isValidISODate(sp.desde) ? sp.desde : addDaysISO(today, -7);
  const to = typeof sp.hasta === "string" && isValidISODate(sp.hasta) ? sp.hasta : today;
  const action = typeof sp.accion === "string" ? sp.accion.slice(0, 40) : "";
  const who = typeof sp.usuario === "string" ? sp.usuario.slice(0, 80) : "";
  const patientId = typeof sp.paciente === "string" ? sp.paciente.slice(0, 64) : "";
  const failures = sp.fallos === "1";
  const data = await listAuditLogs(actor, { fromISO: from, toISO: to, action: action || undefined, actor: who || undefined, patientId: patientId || undefined, onlyFailures: failures, page: Number(sp.pagina) || 1 });
  return (
    <div className="space-y-6">
      <PageHeader title="Auditoría" description="Registro inalterable de accesos, cambios y exportaciones. No puede editarse ni borrarse desde la plataforma." />
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Desde</span>
            <input type="date" name="desde" defaultValue={from} className={`${inputClasses} min-h-10 py-2`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Hasta</span>
            <input type="date" name="hasta" defaultValue={to} className={`${inputClasses} min-h-10 py-2`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Tipo de evento</span>
            <select name="accion" defaultValue={action} className={`${inputClasses} min-h-10 py-2`}>
              <option value="">Todos</option>
              {AUDIT_ACTION_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Usuario</span>
            <input name="usuario" defaultValue={who} placeholder="Nombre" className={`${inputClasses} min-h-10 py-2`} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink">
            <input type="checkbox" name="fallos" value="1" defaultChecked={failures} className="size-5 accent-[var(--brand-primary)]" /> Solo fallidos o denegados
          </label>
          {patientId ? <input type="hidden" name="paciente" value={patientId} /> : null}
          <button type="submit" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong">
            Filtrar
          </button>
        </form>
      </Card>
      <Card>
        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Registros de auditoría</caption>
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Usuario</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Evento</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Detalle</th>
                  <th scope="col" className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{formatDateTime(l.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      {l.actorName ?? "—"}
                      {l.actorRole ? <span className="block text-xs text-muted">{ROLE_LABELS[l.actorRole]}</span> : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{l.action}</span> {!l.success ? <Badge tone="danger">Fallido</Badge> : null}
                      {l.entityType ? <span className="block text-xs text-muted">{l.entityType}</span> : null}
                    </td>
                    <td className="max-w-xs px-4 py-2.5 text-xs break-words text-muted">
                      {l.patientId ? <span className="block">Paciente: {l.patientId}</span> : null}
                      {l.details ? JSON.stringify(l.details) : ""}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{l.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin registros para los filtros elegidos" />
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/panel/auditoria" params={{ desde: from, hasta: to, accion: action, usuario: who, paciente: patientId, fallos: failures ? "1" : "" }} />
      </Card>
    </div>
  );
}
