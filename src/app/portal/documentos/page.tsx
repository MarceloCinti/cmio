import { Download, Eye, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePatient } from "@/server/auth/current";
import { listMyDocuments } from "@/server/services/documents";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Mis documentos" };

export default async function MyDocumentsPage() {
  const actor = await requirePatient();
  const docs = await listMyDocuments(actor);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Mis documentos</h1>
        <p className="mt-1 text-muted">Resultados e informes revisados y autorizados por tu equipo de salud. Solo tú puedes verlos con tu cuenta.</p>
      </div>
      <Card>
        {docs.length ? (
          <ul className="divide-y divide-line">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{d.title}</p>
                    <p className="text-sm text-muted">
                      {DOCUMENT_CATEGORY_LABELS[d.category]} · publicado el {d.publishedAt ? formatDateTime(d.publishedAt) : "—"}
                      {d.reviewedByName ? ` · autorizado por ${d.reviewedByName}` : ""}
                    </p>
                    {d.description ? <p className="mt-1 text-sm text-ink">{d.description}</p> : null}
                  </div>
                </div>
                <div className="flex gap-2 pl-13 sm:pl-0">
                  <a href={`/api/documentos/${d.id}?ver=1`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong px-4 text-sm font-semibold hover:border-primary hover:text-primary">
                    <Eye className="size-4" aria-hidden="true" /> Ver
                  </a>
                  <a href={`/api/documentos/${d.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong">
                    <Download className="size-4" aria-hidden="true" /> Descargar
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FileText className="size-6" aria-hidden="true" />}
            title="Todavía no tienes documentos disponibles"
            description="Cuando un profesional revise y autorice un resultado o informe, aparecerá aquí y te avisaremos."
          />
        )}
      </Card>
    </div>
  );
}
