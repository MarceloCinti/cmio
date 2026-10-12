import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ClipboardPlus, FileText } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton, ConfirmAction } from "@/components/ui/confirm-action";
import { LineChart } from "@/components/charts/line-chart";
import { BackgroundForm, GoalForm } from "@/components/clinical/forms";
import { requireStaff } from "@/server/auth/current";
import { getClinicalRecord, listBackgroundVersions } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { ForbiddenError } from "@/server/errors";
import { ENCOUNTER_STATUS_LABELS, GOAL_METRIC_LABELS, GOAL_STATUS_LABELS, SEX_LABELS } from "@/lib/labels";
import { ageFromBirthDate, formatCalendarDate, formatDateTime, formatDecimal } from "@/lib/format";
import { newEncounterAction, setPortalProgressAction, updateGoalAction } from "@/app/panel/consultas/actions";

export const metadata = { title: "Historia clínica" };

export default async function ClinicalRecordPage({ params, searchParams }: PageProps<"/panel/pacientes/[id]/historia">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const record = await getClinicalRecord(actor, id).catch((e) => {
    if (e instanceof ForbiddenError) redirect("/panel/sin-permiso");
    notFound();
  });
  const { patient, background, backgroundVersions, encounters, vitals, goals } = record;
  const versions = sp.versiones === "1" ? await listBackgroundVersions(actor, id) : [];
  const weights = vitals.filter((v) => v.weightKg !== null).map((v) => ({ t: v.measuredAt.toISOString(), v: Number(v.weightKg) }));
  const lastVitals = [...vitals].reverse()[0];
  const weightGoal = goals.find((g) => g.metric === "WEIGHT" && g.status === "ACTIVE" && g.targetValue !== null);
  const age = ageFromBirthDate(patient.birthDate);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/panel/pacientes/${id}`, label: "Ficha del paciente" }}
        title={`Historia clínica · ${patient.firstName} ${patient.lastName}`}
        description={[age !== null ? `${age} años` : null, patient.sex ? SEX_LABELS[patient.sex] : null, patient.documentNumber ? `CI ${patient.documentNumber}` : null].filter(Boolean).join(" · ")}
        actions={
          <>
            <ActionButton action={newEncounterAction} fields={{ patientId: id }} variant="secondary" size="md" icon={<ClipboardPlus className="size-4" aria-hidden="true" />}>
              Nueva evolución
            </ActionButton>
            <ButtonLink href={`/panel/pacientes/${id}/documentos`} variant="outline" icon={<FileText className="size-4" aria-hidden="true" />}>
              Documentos
            </ButtonLink>
          </>
        }
      />
      <p className="rounded-xl border border-line bg-surface px-4 py-2 text-xs text-muted">
        Información clínica confidencial. Cada acceso queda registrado con tu usuario, fecha y hora.
      </p>

      {background?.allergies ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Alergias informadas:</strong> {background.allergies}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Evolución del peso" description={weights.length ? `${weights.length} registro(s) de consultas` : undefined} />
            <CardBody>
              <LineChart
                points={weights}
                unit="kg"
                label={`Evolución del peso de ${patient.firstName} ${patient.lastName}`}
                reference={weightGoal ? { value: Number(weightGoal.targetValue), label: `Objetivo ${formatDecimal(Number(weightGoal.targetValue))}` } : null}
              />
              {lastVitals ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
                  <Stat label="Último peso" value={lastVitals.weightKg ? `${formatDecimal(Number(lastVitals.weightKg))} kg` : "—"} />
                  <Stat label="IMC" value={lastVitals.bmi ? formatDecimal(Number(lastVitals.bmi)) : "—"} />
                  <Stat label="Cintura" value={lastVitals.waistCm ? `${formatDecimal(Number(lastVitals.waistCm))} cm` : "—"} />
                  <Stat label="Presión arterial" value={lastVitals.systolic && lastVitals.diastolic ? `${lastVitals.systolic}/${lastVitals.diastolic}` : "—"} />
                </dl>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Consultas" description="De la más reciente a la más antigua." />
            {encounters.length ? (
              <ul className="divide-y divide-line">
                {encounters.map((e) => (
                  <li key={e.id}>
                    <Link href={`/panel/consultas/${e.id}`} className="block px-5 py-4 hover:bg-primary-soft/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ink">{e.reason}</p>
                        <Badge tone={e.status === "FINALIZED" ? "success" : "warning"}>{ENCOUNTER_STATUS_LABELS[e.status]}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatDateTime(e.startedAt)} · {professionalDisplayName(e.professional)}
                        {e._count.addenda ? ` · ${e._count.addenda} adenda(s)` : ""}
                      </p>
                      {e.diagnoses.length ? (
                        <p className="mt-1 text-sm text-ink">
                          {e.diagnoses.map((d) => `${d.code ? `${d.code} ` : ""}${d.description}`).join(" · ")}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Todavía no hay consultas registradas" description="Al iniciar una consulta desde la agenda o crear una evolución, aparecerá aquí." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Antecedentes"
              description={
                background ? (
                  <>
                    Versión {background.version} · {background.authorName} · {formatDateTime(background.createdAt)}
                    {backgroundVersions > 1 ? (
                      <>
                        {" "}·{" "}
                        <Link className="text-primary underline" href={`?versiones=1`}>
                          ver {backgroundVersions} versiones
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  "Sin antecedentes registrados."
                )
              }
            />
            <CardBody className="space-y-4">
              {background ? (
                <dl className="space-y-2 text-sm">
                  {(
                    [
                      ["Medicamentos", background.currentMedications],
                      ["Personales", background.personalHistory],
                      ["Familiares", background.familyHistory],
                      ["Quirúrgicos", background.surgicalHistory],
                      ["Hábitos", background.habits],
                      ["Notas", background.notes],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-muted">{k}</dt>
                        <dd className="whitespace-pre-line text-ink">{v}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-primary">{background ? "Actualizar antecedentes" : "Registrar antecedentes"}</summary>
                <div className="mt-4">
                  <BackgroundForm patientId={id} values={background} />
                </div>
              </details>
              {versions.length ? (
                <div className="border-t border-line pt-3">
                  <p className="mb-2 text-sm font-semibold text-ink">Historial de versiones</p>
                  <ol className="space-y-2 text-xs text-muted">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <details>
                          <summary className="cursor-pointer">
                            Versión {v.version} · {v.authorName} · {formatDateTime(v.createdAt)}
                          </summary>
                          <p className="mt-1 whitespace-pre-line text-ink">Alergias: {v.allergies ?? "—"}</p>
                          <p className="whitespace-pre-line text-ink">Medicamentos: {v.currentMedications ?? "—"}</p>
                          <p className="whitespace-pre-line text-ink">Personales: {v.personalHistory ?? "—"}</p>
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Objetivos de tratamiento" />
            <CardBody className="space-y-4">
              {goals.length ? (
                <ul className="space-y-3">
                  {goals.map((g) => (
                    <li key={g.id} className="rounded-xl border border-line p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-ink">{g.description}</p>
                        <Badge tone={g.status === "ACHIEVED" ? "success" : g.status === "ACTIVE" ? "primary" : "neutral"}>{GOAL_STATUS_LABELS[g.status]}</Badge>
                      </div>
                      <p className="mt-1 text-muted">
                        {GOAL_METRIC_LABELS[g.metric]}
                        {g.targetValue !== null ? `: ${formatDecimal(Number(g.targetValue))}` : ""}
                        {g.targetDate ? ` · para el ${formatCalendarDate(g.targetDate)}` : ""}
                        {g.visibleToPatient ? " · visible para el paciente" : ""}
                      </p>
                      {g.status === "ACTIVE" ? (
                        <div className="mt-2 flex gap-2">
                          <ActionButton action={updateGoalAction} fields={{ goalId: g.id, status: "ACHIEVED", patientId: id }} size="sm" variant="subtle">
                            Marcar alcanzado
                          </ActionButton>
                          <ActionButton action={updateGoalAction} fields={{ goalId: g.id, status: "DISCONTINUED", patientId: id }} size="sm" variant="ghost">
                            Suspender
                          </ActionButton>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Sin objetivos definidos.</p>
              )}
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-primary">Agregar objetivo</summary>
                <div className="mt-3">
                  <GoalForm patientId={id} />
                </div>
              </details>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Seguimiento en el portal" />
            <CardBody className="space-y-3 text-sm">
              <p className="text-muted">
                {patient.portalProgressEnabled
                  ? "El paciente puede ver su evolución de peso, objetivos visibles e indicaciones compartidas."
                  : "El paciente no ve su evolución en el portal."}
              </p>
              <ConfirmAction
                action={setPortalProgressAction}
                fields={{ patientId: id, enabled: String(!patient.portalProgressEnabled) }}
                title={patient.portalProgressEnabled ? "Ocultar seguimiento" : "Habilitar seguimiento en el portal"}
                description={
                  patient.portalProgressEnabled
                    ? "El paciente dejará de ver su evolución en el portal."
                    : "El paciente verá la evolución de su peso registrada en consultas finalizadas, los objetivos marcados como visibles y las indicaciones compartidas. No se muestran diagnósticos ni notas clínicas."
                }
                confirmLabel={patient.portalProgressEnabled ? "Ocultar" : "Habilitar"}
                triggerLabel={patient.portalProgressEnabled ? "Ocultar en el portal" : "Habilitar en el portal"}
                triggerVariant="outline"
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-semibold text-ink">{value}</dd>
    </div>
  );
}
