import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmAction, ActionButton } from "@/components/ui/confirm-action";
import { AddendumForm, DiagnosisForm, EncounterForm, PrescriptionForm, StudyOrderForm, VitalsForm } from "@/components/clinical/forms";
import { requireStaff } from "@/server/auth/current";
import { getEncounter } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { DIAGNOSIS_CERTAINTY_LABELS, DIAGNOSIS_KIND_LABELS, ENCOUNTER_STATUS_LABELS, ORDER_STATUS_LABELS } from "@/lib/labels";
import { ageFromBirthDate, formatCalendarDate, formatDateTime, formatDecimal } from "@/lib/format";
import { dbDateToISO } from "@/lib/time";
import {
  deletePrescriptionAction,
  deleteStudyOrderAction,
  finalizeEncounterAction,
  removeDiagnosisAction,
  voidOrderAction,
} from "../actions";

export const metadata = { title: "Consulta" };

export default async function EncounterPage({ params }: PageProps<"/panel/consultas/[id]">) {
  const { id } = await params;
  const actor = await requireStaff();
  const enc = await getEncounter(actor, id).catch((e) => {
    if (e instanceof ForbiddenError) redirect("/panel/sin-permiso");
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const editable = enc.status === "DRAFT" && enc.professionalId === actor.professionalId;
  const vitals = enc.vitalSigns[0] ?? null;
  const draftRx = enc.prescriptions.find((p) => p.status === "DRAFT");
  const draftOrder = enc.studyOrders.find((o) => o.status === "DRAFT");
  const age = ageFromBirthDate(enc.patient.birthDate);
  const isAuthorPro = enc.professionalId === actor.professionalId;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/panel/pacientes/${enc.patientId}/historia`, label: "Historia clínica" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {enc.patient.firstName} {enc.patient.lastName}
            <Badge tone={enc.status === "FINALIZED" ? "success" : "warning"}>{ENCOUNTER_STATUS_LABELS[enc.status]}</Badge>
          </span>
        }
        description={`${formatDateTime(enc.startedAt)} · ${professionalDisplayName(enc.professional)}${age !== null ? ` · ${age} años` : ""}${enc.appointment ? ` · Cita ${enc.appointment.code}` : ""}`}
        actions={
          editable ? (
            <ConfirmAction
              action={finalizeEncounterAction}
              fields={{ encounterId: enc.id }}
              title="Finalizar la consulta"
              description="Se emitirán las recetas y órdenes en borrador y el registro quedará bloqueado. Después solo podrás agregar adendas. Asegúrate de haber guardado el borrador."
              confirmLabel="Finalizar consulta"
              triggerLabel="Finalizar consulta"
              triggerVariant="secondary"
              triggerSize="md"
              triggerIcon={<Lock className="size-4" aria-hidden="true" />}
            />
          ) : null
        }
      />
      {enc.status === "FINALIZED" ? (
        <Alert tone="info" title="Consulta finalizada">
          Finalizada el {enc.finalizedAt ? formatDateTime(enc.finalizedAt) : ""} por {enc.authorName}. El registro no puede modificarse; las correcciones se agregan como adendas con autor y fecha.
        </Alert>
      ) : !editable ? (
        <Alert tone="warning">Esta consulta está en borrador y solo puede editarla el profesional que la realiza.</Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Registro de la consulta" />
            <CardBody>
              {editable ? (
                <EncounterForm
                  encounterId={enc.id}
                  values={{
                    reason: enc.reason,
                    currentIllness: enc.currentIllness,
                    physicalExam: enc.physicalExam,
                    assessment: enc.assessment,
                    plan: enc.plan,
                    followUpInstructions: enc.followUpInstructions,
                    patientInstructions: enc.patientInstructions,
                    sharePatientInstructions: enc.sharePatientInstructions,
                    clinicalNotes: enc.clinicalNotes,
                    nextEvaluationDate: enc.nextEvaluationDate ? dbDateToISO(enc.nextEvaluationDate) : null,
                  }}
                />
              ) : (
                <dl className="space-y-4">
                  {(
                    [
                      ["Motivo de consulta", enc.reason],
                      ["Historia de la enfermedad actual", enc.currentIllness],
                      ["Examen físico", enc.physicalExam],
                      ["Evaluación clínica", enc.assessment],
                      ["Plan de atención", enc.plan],
                      ["Indicaciones de seguimiento", enc.followUpInstructions],
                      [`Indicaciones para el paciente${enc.sharePatientInstructions ? " (compartidas en el portal)" : ""}`, enc.patientInstructions],
                      ["Notas clínicas", enc.clinicalNotes],
                      ["Próxima evaluación", enc.nextEvaluationDate ? formatCalendarDate(enc.nextEvaluationDate) : null],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-sm font-semibold text-ink">{k}</dt>
                        <dd className="mt-1 whitespace-pre-line text-ink/90">{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </CardBody>
          </Card>

          {enc.status === "FINALIZED" ? (
            <Card>
              <CardHeader title="Adendas" description="Correcciones o información agregada después de finalizar." />
              <CardBody className="space-y-4">
                {enc.addenda.length ? (
                  <ol className="space-y-3">
                    {enc.addenda.map((a) => (
                      <li key={a.id} className="rounded-xl border border-line bg-canvas p-3 text-sm">
                        <p className="text-xs text-muted">
                          {formatDateTime(a.createdAt)} · {a.authorName}
                          {a.reason ? ` · ${a.reason}` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-ink">{a.content}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">Sin adendas.</p>
                )}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-primary">Agregar adenda</summary>
                  <div className="mt-3">
                    <AddendumForm encounterId={enc.id} />
                  </div>
                </details>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Signos vitales y medidas" />
            <CardBody>
              {editable ? (
                <VitalsForm
                  encounterId={enc.id}
                  values={
                    vitals
                      ? Object.fromEntries(
                          (["weightKg", "heightCm", "waistCm", "hipCm", "bodyFatPct", "systolic", "diastolic", "heartRate", "respiratoryRate", "temperatureC", "spo2"] as const).map((k) => [
                            k,
                            vitals[k] === null ? "" : String(vitals[k]),
                          ]),
                        )
                      : null
                  }
                />
              ) : vitals ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {(
                    [
                      ["Peso", vitals.weightKg, "kg"],
                      ["Talla", vitals.heightCm, "cm"],
                      ["IMC", vitals.bmi, ""],
                      ["Cintura", vitals.waistCm, "cm"],
                      ["Cadera", vitals.hipCm, "cm"],
                      ["Grasa corporal", vitals.bodyFatPct, "%"],
                      ["PA", vitals.systolic && vitals.diastolic ? `${vitals.systolic}/${vitals.diastolic}` : null, "mmHg"],
                      ["FC", vitals.heartRate, "lpm"],
                      ["FR", vitals.respiratoryRate, "rpm"],
                      ["Temperatura", vitals.temperatureC, "°C"],
                      ["SpO₂", vitals.spo2, "%"],
                    ] as const
                  )
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([k, v, u]) => (
                      <div key={k}>
                        <dt className="text-muted">{k}</dt>
                        <dd className="font-semibold text-ink">
                          {typeof v === "string" ? v : formatDecimal(Number(v))} {u}
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-sm text-muted">Sin registros.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Diagnósticos" />
            <CardBody className="space-y-4">
              {enc.diagnoses.length ? (
                <ul className="space-y-2">
                  {enc.diagnoses.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 text-sm">
                      <span>
                        <span className="font-medium text-ink">
                          {d.code ? `${d.code} · ` : ""}
                          {d.description}
                        </span>
                        <span className="block text-xs text-muted">
                          {DIAGNOSIS_KIND_LABELS[d.kind]} · {DIAGNOSIS_CERTAINTY_LABELS[d.certainty]}
                        </span>
                      </span>
                      {editable ? (
                        <ActionButton action={removeDiagnosisAction} fields={{ diagnosisId: d.id, encounterId: enc.id }} size="sm" variant="ghost" icon={<Trash2 className="size-4" aria-hidden="true" />}>
                          <span className="sr-only">Quitar diagnóstico</span>
                        </ActionButton>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Sin diagnósticos registrados.</p>
              )}
              {editable ? <DiagnosisForm encounterId={enc.id} /> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recetas" description="Sin firma digital: deben firmarse y sellarse de forma manuscrita." />
            <CardBody className="space-y-4">
              {enc.prescriptions.filter((p) => p.status !== "DRAFT").map((p) => (
                <OrderRow key={p.id} kind="prescription" id={p.id} encounterId={enc.id} status={p.status} code={p.verificationCode} canVoid={isAuthorPro && p.status === "ISSUED"} summary={p.items.map((i) => i.medication).join(", ")} voidReason={p.voidReason} />
              ))}
              {editable ? (
                <>
                  <PrescriptionForm
                    encounterId={enc.id}
                    items={(draftRx?.items ?? []).map((i) => ({ medication: i.medication, dose: i.dose, frequency: i.frequency, duration: i.duration, quantity: i.quantity, instructions: i.instructions }))}
                    notes={draftRx?.notes ?? null}
                  />
                  {draftRx ? (
                    <ActionButton action={deletePrescriptionAction} fields={{ prescriptionId: draftRx.id, encounterId: enc.id }} size="sm" variant="ghost">
                      Descartar borrador de receta
                    </ActionButton>
                  ) : null}
                </>
              ) : !enc.prescriptions.length ? (
                <p className="text-sm text-muted">Sin recetas.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Solicitud de estudios" />
            <CardBody className="space-y-4">
              {enc.studyOrders.filter((o) => o.status !== "DRAFT").map((o) => (
                <OrderRow key={o.id} kind="study" id={o.id} encounterId={enc.id} status={o.status} code={o.verificationCode} canVoid={isAuthorPro && o.status === "ISSUED"} summary={o.studies.join(", ")} voidReason={o.voidReason} />
              ))}
              {editable ? (
                <>
                  <StudyOrderForm encounterId={enc.id} studies={draftOrder?.studies ?? []} indication={draftOrder?.indication ?? null} isUrgent={draftOrder?.isUrgent ?? false} />
                  {draftOrder ? (
                    <ActionButton action={deleteStudyOrderAction} fields={{ orderId: draftOrder.id, encounterId: enc.id }} size="sm" variant="ghost">
                      Descartar borrador de orden
                    </ActionButton>
                  ) : null}
                </>
              ) : !enc.studyOrders.length ? (
                <p className="text-sm text-muted">Sin solicitudes de estudios.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documentos de la consulta" />
            <CardBody className="space-y-2 text-sm">
              {enc.documents.length ? (
                enc.documents.map((d) => (
                  <p key={d.id}>
                    <a href={`/api/documentos/${d.id}?ver=1`} target="_blank" rel="noopener" className="text-primary hover:underline">
                      {d.title}
                    </a>
                  </p>
                ))
              ) : (
                <p className="text-muted">Sin documentos vinculados.</p>
              )}
              <Link href={`/panel/pacientes/${enc.patientId}/documentos?consulta=${enc.id}`} className="font-semibold text-primary hover:underline">
                Subir documento
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  kind,
  id,
  encounterId,
  status,
  code,
  canVoid,
  summary,
  voidReason,
}: {
  kind: "prescription" | "study";
  id: string;
  encounterId: string;
  status: "DRAFT" | "ISSUED" | "VOIDED";
  code: string;
  canVoid: boolean;
  summary: string;
  voidReason: string | null;
}) {
  return (
    <div className="rounded-xl border border-line p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={status === "ISSUED" ? "success" : status === "VOIDED" ? "danger" : "warning"}>{ORDER_STATUS_LABELS[status]}</Badge>
        <span className="font-mono text-xs text-muted">{code}</span>
      </div>
      <p className="mt-2 text-ink">{summary}</p>
      {voidReason ? <p className="mt-1 text-xs text-red-800">Motivo de anulación: {voidReason}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <ButtonLink href={`/imprimir/${kind === "prescription" ? "receta" : "orden"}/${id}`} target="_blank" size="sm" variant="outline" icon={<Printer className="size-4" aria-hidden="true" />}>
          Imprimir
        </ButtonLink>
        {canVoid ? (
          <ConfirmAction
            action={voidOrderAction}
            fields={{ kind, id, encounterId }}
            title="Anular documento"
            description="El documento quedará anulado (la verificación mostrará «Anulado»). Su contenido se conserva para la trazabilidad."
            confirmLabel="Anular"
            triggerLabel="Anular"
            destructive
            reasonLabel="Motivo de la anulación"
            reasonRequired
          />
        ) : null}
      </div>
    </div>
  );
}
