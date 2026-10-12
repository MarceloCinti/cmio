import type { Metadata } from "next";
import { BadgeCheck, CircleX, SearchX } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { verifyClinicalDocument } from "@/server/services/clinical";
import { professionalDisplayName } from "@/server/services/public-site";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { getRequestMeta } from "@/server/auth/request-meta";
import { RateLimitError } from "@/server/errors";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Verificar documento", robots: { index: false } };

// Verificación de recetas y órdenes impresas. Muestra solo lo necesario para comprobar
// su validez: no expone diagnósticos ni el contenido del documento.
export default async function VerifyPage({ params }: PageProps<"/verificar/[codigo]">) {
  const { codigo } = await params;
  let limited = false;
  try {
    await enforceRateLimit(`verificar:${(await getRequestMeta()).ip}`, 30, 60);
  } catch (e) {
    if (e instanceof RateLimitError) limited = true;
    else throw e;
  }
  const doc = limited ? null : await verifyClinicalDocument(codigo);
  return (
    <>
      <PageHero title="Verificación de documentos" intro="Comprueba si una receta u orden de estudios fue emitida por la plataforma de la clínica." />
      <div className="container-page max-w-2xl py-12">
        {limited ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-muted">Realizaste demasiadas consultas. Intenta nuevamente en un minuto.</p>
        ) : doc ? (
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <p className={`flex items-center gap-2 text-xl font-bold ${doc.status === "ISSUED" ? "text-emerald-700" : "text-red-700"}`}>
              {doc.status === "ISSUED" ? <BadgeCheck className="size-6" aria-hidden="true" /> : <CircleX className="size-6" aria-hidden="true" />}
              {doc.status === "ISSUED" ? `${doc.kind} emitida y vigente` : doc.status === "VOIDED" ? `${doc.kind} anulada` : `${doc.kind} no emitida`}
            </p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Código</dt>
                <dd className="font-mono font-semibold text-ink">{codigo.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-muted">Fecha de emisión</dt>
                <dd className="font-semibold text-ink">{doc.issuedAt ? formatDateTime(doc.issuedAt) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Profesional</dt>
                <dd className="font-semibold text-ink">{professionalDisplayName(doc.professional)}</dd>
              </div>
              <div>
                <dt className="text-muted">Paciente (iniciales)</dt>
                <dd className="font-semibold text-ink">
                  {doc.patient.firstName[0]}. {doc.patient.lastName[0]}.
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-muted">
              Este documento no cuenta con firma digital: su validez requiere la firma y el sello manuscritos del profesional.
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-6 text-ink">
            <SearchX className="size-5 text-muted" aria-hidden="true" /> No encontramos un documento con ese código. Verifica que lo hayas escrito correctamente.
          </p>
        )}
      </div>
    </>
  );
}
