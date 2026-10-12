import { PageHero } from "./page-hero";
import { Alert } from "@/components/ui/alert";
import { SimpleMarkdown } from "@/components/simple-markdown";

export function LegalPage({ title, text, reviewed, version }: { title: string; text: string; reviewed: boolean; version: string }) {
  return (
    <>
      <PageHero title={title} />
      <div className="container-page max-w-3xl py-12">
        {!reviewed ? (
          <Alert tone="warning" title="Documento en revisión" className="mb-8">
            Este texto es un borrador inicial y está pendiente de revisión por asesoría legal antes de su versión definitiva.
          </Alert>
        ) : null}
        <SimpleMarkdown text={text} />
        <p className="mt-10 text-xs text-muted">Versión: {version}</p>
      </div>
    </>
  );
}
