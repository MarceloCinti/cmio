import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/charts/line-chart";
import { requirePatient } from "@/server/auth/current";
import { getMyProgress } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { GOAL_METRIC_LABELS, GOAL_STATUS_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDecimal, formatLongDate } from "@/lib/format";

export const metadata = { title: "Mi seguimiento" };

export default async function MyProgressPage() {
  const actor = await requirePatient();
  const data = await getMyProgress(actor);
  if (!data) redirect("/portal");
  const weights = data.vitals.filter((v) => v.weightKg !== null).map((v) => ({ t: v.measuredAt.toISOString(), v: Number(v.weightKg) }));
  const weightGoal = data.goals.find((g) => g.metric === "WEIGHT" && g.status === "ACTIVE" && g.targetValue !== null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Mi seguimiento</h1>
        <p className="mt-1 text-muted">Información registrada por tu equipo de salud en tus consultas. Ante cualquier duda, consulta con tu profesional.</p>
      </div>
      <Card>
        <CardHeader title="Evolución de tu peso" description="Medidas tomadas en la clínica, con la fecha de cada consulta." />
        <CardBody>
          <LineChart
            points={weights}
            unit="kg"
            label="Evolución de tu peso"
            reference={weightGoal ? { value: Number(weightGoal.targetValue), label: `Objetivo ${formatDecimal(Number(weightGoal.targetValue))}` } : null}
          />
        </CardBody>
      </Card>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Tus objetivos" />
          <CardBody>
            {data.goals.length ? (
              <ul className="space-y-3">
                {data.goals.map((g) => (
                  <li key={g.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <Target className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{g.description}</p>
                      <p className="text-sm text-muted">
                        {GOAL_METRIC_LABELS[g.metric]}
                        {g.targetValue !== null ? `: ${formatDecimal(Number(g.targetValue))}` : ""}
                        {g.targetDate ? ` · para el ${formatCalendarDate(g.targetDate)}` : ""}
                      </p>
                    </div>
                    <Badge tone={g.status === "ACHIEVED" ? "success" : "primary"}>{GOAL_STATUS_LABELS[g.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Tu equipo todavía no registró objetivos visibles.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Próximas evaluaciones sugeridas" />
          <CardBody>
            {data.nextEvaluations.length ? (
              <ul className="space-y-2 text-sm">
                {data.nextEvaluations.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium text-ink">{e.nextEvaluationDate ? formatCalendarDate(e.nextEvaluationDate) : ""}</span> · {professionalDisplayName(e.professional)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No hay evaluaciones sugeridas pendientes.</p>
            )}
          </CardBody>
        </Card>
      </div>
      {data.instructions.length ? (
        <Card>
          <CardHeader title="Indicaciones registradas en tus consultas" />
          <ul className="divide-y divide-line">
            {data.instructions.map((i) => (
              <li key={i.id} className="px-5 py-4">
                <p className="text-xs text-muted">
                  {i.finalizedAt ? formatLongDate(i.finalizedAt) : ""} · {professionalDisplayName(i.professional)}
                </p>
                <p className="mt-1 whitespace-pre-line text-ink">{i.patientInstructions}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
