import { notFound, redirect } from "next/navigation";
import { Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton, ConfirmAction } from "@/components/ui/confirm-action";
import { UploadDocumentForm } from "@/components/clinical/upload-form";
import { requireStaff } from "@/server/auth/current";
import { listPatientDocuments } from "@/server/services/documents";
import { ForbiddenError } from "@/server/errors";
import { db } from "@/server/db";
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { publishDocumentAction, withdrawDocumentAction } from "@/app/panel/consultas/actions";

export const metadata = { title: "Documentos del paciente" };

export default async function PatientDocumentsPage({ params, searchParams }: PageProps<"/panel/pacientes/[id]/documentos">) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requireStaff();
  const patient = await db.patient.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  if (!patient) notFound();
  const { docs, canReview, canDownload } = await listPatientDocuments(actor, id).catch((e) => {
    if (e instanceof ForbiddenError) redirect("/panel/sin-permiso");
    throw e;
  });
  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/panel/pacientes/${id}`, label: "Ficha del paciente" }}
        title={`Documentos · ${patient.firstName} ${patient.lastName}`}
        description="Los archivos se guardan en almacenamiento privado. El paciente solo ve los documentos publicados por un profesional."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title={`Documentos (${docs.length})`} />
          {docs.length ? (
            <ul className="divide-y divide-line">
              {docs.map((d) => (
                <li key={d.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{d.title}</p>
                      <p className="text-xs text-muted">
                        {DOCUMENT_CATEGORY_LABELS[d.category]} · subido por {d.uploadedByName} el {formatDateTime(d.createdAt)}
                        {d.reviewedByName ? ` · revisado por ${d.reviewedByName}` : ""}
                      </p>
                      {d.withdrawnReason ? <p className="text-xs text-red-800">Retirado: {d.withdrawnReason}</p> : null}
                    </div>
                    <Badge tone={d.status === "PUBLISHED" ? "success" : d.status === "PENDING_REVIEW" ? "warning" : "neutral"}>{DOCUMENT_STATUS_LABELS[d.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canDownload ? (
                      <>
                        <a href={`/api/documentos/${d.id}?ver=1`} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold hover:border-primary hover:text-primary">
                          <Eye className="size-4" aria-hidden="true" /> Ver
                        </a>
                        <a href={`/api/documentos/${d.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-semibold hover:border-primary hover:text-primary">
                          <Download className="size-4" aria-hidden="true" /> Descargar
                        </a>
                      </>
                    ) : null}
                    {canReview && d.status !== "PUBLISHED" ? (
                      <ActionButton action={publishDocumentAction} fields={{ documentId: d.id, patientId: id }} variant="secondary">
                        Autorizar y publicar
                      </ActionButton>
                    ) : null}
                    {canReview && d.status === "PUBLISHED" ? (
                      <ConfirmAction
                        action={withdrawDocumentAction}
                        fields={{ documentId: d.id, patientId: id }}
                        title="Retirar del portal"
                        description="El paciente dejará de ver este documento. El archivo se conserva."
                        confirmLabel="Retirar"
                        triggerLabel="Retirar del portal"
                        destructive
                        reasonLabel="Motivo"
                        reasonRequired
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No hay documentos" description="Sube resultados, informes u otros documentos del paciente." />
          )}
        </Card>
        <Card>
          <CardHeader title="Subir documento" />
          <CardBody>
            <UploadDocumentForm patientId={id} encounterId={typeof sp.consulta === "string" ? sp.consulta : undefined} canPublish={canReview} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
