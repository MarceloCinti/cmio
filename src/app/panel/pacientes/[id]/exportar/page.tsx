import { redirect } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { inputClasses } from "@/components/ui/form";
import { PrintButton } from "@/components/clinical/print-button";
import { requirePermission } from "@/server/auth/current";
import { exportClinicalRecord } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { AppError } from "@/server/errors";
import { db } from "@/server/db";
import { ENCOUNTER_STATUS_LABELS, ORDER_STATUS_LABELS } from "@/lib/labels";
import { formatCalendarDate, formatDateTime, formatDecimal } from "@/lib/format";

export const metadata = { title: "Exportar historia clínica" };

export default async function ExportClinicalPage({ params, searchParams }: PageProps<"/panel/pacientes/[id]/exportar">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requirePermission("clinica.exportar");
  const reason = typeof sp.motivo === "string" ? sp.motivo.trim().slice(0, 300) : "";
  const patient = await db.patient.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  if (!patient) redirect("/panel/pacientes");

  if (!reason) {
    return (
      <div className="max-w-2xl">
        <PageHeader back={{ href: `/panel/pacientes/${id}`, label: "Ficha del paciente" }} title="Exportar historia clínica" description={`${patient.firstName} ${patient.lastName}`} />
        <Card>
          <CardBody>
            <Alert tone="warning" className="mb-4">
              La exportación incluye información clínica completa. Queda registrada en la auditoría con tu usuario, la fecha y el motivo. Entrégala solo a quien corresponda legalmente.
            </Alert>
            <form className="space-y-4" method="get">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink">Motivo de la exportación *</span>
                <input name="motivo" required minLength={5} maxLength={300} className={inputClasses} placeholder="Ej.: solicitud escrita del paciente del 10/10/2026" />
              </label>
              <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-strong">
                Generar exportación
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  let data;
  try {
    data = await exportClinicalRecord(actor, id, { reason });
  } catch (e) {
    if (e instanceof AppError) redirect(`/panel/pacientes/${id}/exportar`);
    throw e;
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PageHeader back={{ href: `/panel/pacientes/${id}`, label: "Ficha del paciente" }} title="Historia clínica exportada" description={`Motivo registrado: ${reason}`} />
        <PrintButton />
      </div>
      <article className="space-y-6 rounded-2xl border border-line bg-white p-6 text-sm print:border-0 print:p-0">
        <header className="border-b border-black pb-3">
          <h2 className="text-xl font-bold">
            Historia clínica · {data.firstName} {data.lastName}
          </h2>
          <p>
            Documento: {data.documentNumber ?? "—"} · Nacimiento: {data.birthDate ? formatCalendarDate(data.birthDate) : "—"} · Exportado el {formatDateTime(new Date())} por {actor.name}
          </p>
        </header>
        <section>
          <h3 className="mb-2 text-base font-bold">Antecedentes (versiones)</h3>
          {data.backgrounds.length ? (
            data.backgrounds.map((b) => (
              <div key={b.id} className="mb-3 border-l-2 border-slate-300 pl-3">
                <p className="text-xs text-slate-600">
                  Versión {b.version} · {b.authorName} · {formatDateTime(b.createdAt)}
                </p>
                <p>Alergias: {b.allergies ?? "—"}</p>
                <p>Medicamentos: {b.currentMedications ?? "—"}</p>
                <p>Personales: {b.personalHistory ?? "—"}</p>
                <p>Familiares: {b.familyHistory ?? "—"}</p>
                <p>Quirúrgicos: {b.surgicalHistory ?? "—"}</p>
                <p>Hábitos: {b.habits ?? "—"}</p>
              </div>
            ))
          ) : (
            <p>Sin registros.</p>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-base font-bold">Consultas</h3>
          {data.encounters.map((e) => (
            <div key={e.id} className="mb-5 break-inside-avoid border-t border-slate-300 pt-3">
              <p className="font-semibold">
                {formatDateTime(e.startedAt)} · {professionalDisplayName(e.professional)} · {ENCOUNTER_STATUS_LABELS[e.status]}
              </p>
              <p>Motivo: {e.reason}</p>
              {e.currentIllness ? <p>Enfermedad actual: {e.currentIllness}</p> : null}
              {e.physicalExam ? <p>Examen físico: {e.physicalExam}</p> : null}
              {e.assessment ? <p>Evaluación: {e.assessment}</p> : null}
              {e.plan ? <p>Plan: {e.plan}</p> : null}
              {e.vitalSigns.map((v) => (
                <p key={v.id}>
                  Medidas: {v.weightKg ? `peso ${formatDecimal(Number(v.weightKg))} kg; ` : ""}
                  {v.bmi ? `IMC ${formatDecimal(Number(v.bmi))}; ` : ""}
                  {v.systolic ? `PA ${v.systolic}/${v.diastolic}; ` : ""}
                  {v.waistCm ? `cintura ${formatDecimal(Number(v.waistCm))} cm` : ""}
                </p>
              ))}
              {e.diagnoses.length ? <p>Diagnósticos: {e.diagnoses.map((d) => `${d.code ?? ""} ${d.description}`.trim()).join("; ")}</p> : null}
              {e.prescriptions.map((p) => (
                <p key={p.id}>
                  Receta {p.verificationCode} ({ORDER_STATUS_LABELS[p.status]}): {p.items.map((i) => i.medication).join(", ")}
                </p>
              ))}
              {e.studyOrders.map((o) => (
                <p key={o.id}>
                  Orden {o.verificationCode} ({ORDER_STATUS_LABELS[o.status]}): {o.studies.join(", ")}
                </p>
              ))}
              {e.addenda.map((a) => (
                <p key={a.id} className="italic">
                  Adenda {formatDateTime(a.createdAt)} ({a.authorName}): {a.content}
                </p>
              ))}
            </div>
          ))}
        </section>
        <section>
          <h3 className="mb-2 text-base font-bold">Documentos</h3>
          {data.documents.length ? data.documents.map((d) => <p key={d.id}>{d.title} · {formatDateTime(d.createdAt)}</p>) : <p>Sin documentos.</p>}
        </section>
      </article>
    </div>
  );
}
