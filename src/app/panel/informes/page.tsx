import { Download } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/panel/stat-tile";
import { BarList } from "@/components/charts/bar-list";
import { inputClasses } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getOperationalReport } from "@/server/services/reports";
import { professionalDisplayName } from "@/server/services/public-site";
import { db } from "@/server/db";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { addDaysISO, isValidISODate, startOfMonthISO, todayISO } from "@/lib/time";
import { formatLongDate } from "@/lib/format";
import { DateFilterFormatter } from "@/components/panel/date-filter-formatter";

export const metadata = { title: "Informes" };

export default async function ReportsPage({ searchParams }: PageProps<"/panel/informes">) {
  const actor = await requirePermission("informes.ver");
  const sp = await searchParams;
  const today = todayISO();
  const presets = [
    { key: "hoy", label: "Hoy", from: today, to: today },
    { key: "7d", label: "Últimos 7 días", from: addDaysISO(today, -6), to: today },
    { key: "30d", label: "Últimos 30 días", from: addDaysISO(today, -29), to: today },
    { key: "mes", label: "Este mes", from: startOfMonthISO(today), to: addDaysISO(startOfMonthISO(addDaysISO(startOfMonthISO(today), 32)), -1) },
    { key: "mes-anterior", label: "Mes anterior", from: startOfMonthISO(addDaysISO(startOfMonthISO(today), -1)), to: addDaysISO(startOfMonthISO(today), -1) },
  ];
  const preset = presets.find((p) => p.key === sp.periodo);
  let from = preset?.from ?? (typeof sp.desde === "string" && isValidISODate(sp.desde) ? sp.desde : presets[3].from);
  let to = preset?.to ?? (typeof sp.hasta === "string" && isValidISODate(sp.hasta) ? sp.hasta : presets[3].to);
  if (to < from) [from, to] = [to, from];
  if (addDaysISO(from, 366) < to) to = addDaysISO(from, 366);
  const professionalId = typeof sp.profesional === "string" ? sp.profesional : "";
  const specialtyId = typeof sp.especialidad === "string" ? sp.especialidad : "";

  const [report, professionals, specialties] = await Promise.all([
    getOperationalReport(actor, { fromISO: from, toISO: to, professionalId: professionalId || null, specialtyId: specialtyId || null }),
    db.professional.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { lastName: "asc" }, select: { id: true, honorific: true, firstName: true, lastName: true } }),
    db.specialty.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const qs = new URLSearchParams({ desde: from, hasta: to, ...(professionalId ? { profesional: professionalId } : {}), ...(specialtyId ? { especialidad: specialtyId } : {}) });
  const activePreset = presets.find((p) => p.from === from && p.to === to)?.key;
  const attendanceBase = report.completed + report.noShow;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informes"
        description={`Indicadores calculados con los registros reales del ${formatLongDate(`${from}T12:00:00Z`)} al ${formatLongDate(`${to}T12:00:00Z`)}.`}
        actions={
          can(actor, "informes.exportar") ? (
            <a href={`/api/informes/citas?${qs.toString()}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-[0.95rem] font-semibold text-ink hover:border-primary hover:text-primary">
              <Download className="size-4" aria-hidden="true" /> Exportar citas (CSV)
            </a>
          ) : null
        }
      />
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filtros del informe">
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="mb-1 text-sm font-medium text-ink">Período</legend>
            {presets.map((p) => (
              <button
                key={p.key}
                type="submit"
                name="periodo"
                value={p.key}
                aria-pressed={activePreset === p.key}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${activePreset === p.key ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink hover:border-primary"}`}
              >
                {p.label}
              </button>
            ))}
          </fieldset>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Desde</span>
            <input type="date" name="desde" defaultValue={from} className={`${inputClasses} min-h-10 py-2`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Hasta</span>
            <input type="date" name="hasta" defaultValue={to} className={`${inputClasses} min-h-10 py-2`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Profesional</span>
            <select name="profesional" defaultValue={professionalId} className={`${inputClasses} min-h-10 py-2`}>
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {professionalDisplayName(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Especialidad</span>
            <select name="especialidad" defaultValue={specialtyId} className={`${inputClasses} min-h-10 py-2`}>
              <option value="">Todas</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong">
            Aplicar
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Citas en el período" value={report.total} hint={`${report.fromPortal} agendadas desde el portal`} />
        <StatTile label="Pacientes atendidos" value={report.completed} hint="Citas finalizadas" />
        <StatTile label="Ocupación de agendas" value={report.occupancy === null ? "—" : `${report.occupancy}%`} hint={`${Math.round(report.bookedMinutes / 60)} h reservadas de ${Math.round(report.availableMinutes / 60)} h disponibles`} />
        <StatTile label="Nuevos pacientes" value={report.newPatients} hint="Fichas creadas en el período" />
        <StatTile label="Confirmadas" value={report.confirmed} hint="Pendientes de atención, con asistencia confirmada" />
        <StatTile label="Cancelaciones" value={report.cancelled} hint={report.total ? `${Math.round((report.cancelled / report.total) * 100)}% del total` : undefined} />
        <StatTile label="Ausencias" value={report.noShow} hint={attendanceBase ? `${Math.round((report.noShow / attendanceBase) * 100)}% de las citas que debían atenderse` : undefined} />
        <StatTile label="Programadas sin confirmar" value={report.scheduled} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Citas por día" description="Excluye canceladas." />
          <CardBody>
            <DateFilterFormatter data={report.byDay} label="Citas por día en el período" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Distribución por especialidad" description="Excluye canceladas." />
          <CardBody>
            <BarList rows={report.bySpecialty} label="Citas por especialidad" />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Citas por estado" />
        <CardBody>
          <table className="w-full max-w-lg text-left text-sm">
            <caption className="sr-only">Citas por estado en el período</caption>
            <tbody className="divide-y divide-line">
              {report.statusRows.map((r) => (
                <tr key={r.status}>
                  <th scope="row" className="py-2 font-medium text-ink">
                    {APPOINTMENT_STATUS_LABELS[r.status]}
                  </th>
                  <td className="py-2 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <p className="text-xs text-muted">
        La ocupación compara los minutos reservados con los minutos de agenda disponibles según la disponibilidad semanal, descontando feriados, cierres y bloqueos. Los informes no incluyen información clínica.
      </p>
    </div>
  );
}
