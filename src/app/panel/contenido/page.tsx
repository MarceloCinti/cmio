import { Eye, Rocket } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { SegmentedLinks } from "@/components/panel/query-controls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ContentSectionEditor } from "@/components/content/content-editors";
import { requirePermission } from "@/server/auth/current";
import { getContentStatus, getSiteContent } from "@/server/services/settings";
import { formatDateTime } from "@/lib/format";
import type { SiteContentKey } from "@/lib/site-content";
import { discardDraftAction, publishContentAction } from "../admin-actions";

export const metadata = { title: "Contenido del sitio" };

const SECTIONS: { slug: string; key: SiteContentKey; label: string; description: string }[] = [
  { slug: "institucion", key: "institution", label: "Institución y contacto", description: "Nombre, dirección, teléfonos, WhatsApp, horarios y mapa." },
  { slug: "clinica", key: "landing", label: "Página de inicio", description: "Textos e imágenes de cada sección de la landing page." },
  { slug: "identidad", key: "branding", label: "Identidad visual", description: "Logotipo, colores y tipografías." },
  { slug: "legal", key: "legal", label: "Textos legales", description: "Privacidad, términos y aviso de tratamiento de datos." },
  { slug: "aviso", key: "announcement", label: "Aviso institucional", description: "Banda superior para comunicados temporales." },
];

export default async function ContentPage({ searchParams }: PageProps<"/panel/contenido">) {
  await requirePermission("contenido.gestionar");
  const sp = await searchParams;
  const section = SECTIONS.find((s) => s.slug === sp.seccion) ?? SECTIONS[0];
  const [draft, status] = await Promise.all([getSiteContent("draft"), getContentStatus()]);
  const pending = status.filter((s) => s.hasChanges);
  const st = status.find((s) => s.key === section.key);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contenido del sitio"
        description="Edita en borrador, revisa la vista previa y publica. Estos cambios no modifican permisos, agenda ni reglas clínicas."
        actions={
          <>
            <ButtonLink href="/vista-previa" target="_blank" variant="outline" icon={<Eye className="size-4" aria-hidden="true" />}>
              Vista previa
            </ButtonLink>
            <ConfirmAction
              action={publishContentAction}
              title="Publicar cambios"
              description={
                pending.length
                  ? `Se publicarán los cambios de: ${pending.map((p) => SECTIONS.find((s) => s.key === p.key)?.label).join(", ")}. Revisa la vista previa antes de continuar.`
                  : "No hay cambios pendientes de publicar."
              }
              confirmLabel="Publicar"
              triggerLabel={`Publicar${pending.length ? ` (${pending.length})` : ""}`}
              triggerVariant="secondary"
              triggerSize="md"
              triggerIcon={<Rocket className="size-4" aria-hidden="true" />}
            />
          </>
        }
      />
      {pending.length ? (
        <Alert tone="info">
          Hay cambios guardados sin publicar en: {pending.map((p) => SECTIONS.find((s) => s.key === p.key)?.label).join(", ")}.
        </Alert>
      ) : null}
      <div className="overflow-x-auto pb-1">
        <SegmentedLinks label="Secciones" current={section.slug} items={SECTIONS.map((s) => ({ value: s.slug, label: s.label, href: `/panel/contenido?seccion=${s.slug}` }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{section.label}</h2>
          <p className="text-sm text-muted">{section.description}</p>
          <p className="mt-1 text-xs text-muted">
            {st?.publishedAt ? `Última publicación: ${formatDateTime(st.publishedAt)}` : "Contenido inicial (sin publicaciones desde el panel)."}{" "}
            {st?.hasChanges ? <Badge tone="warning">Borrador sin publicar</Badge> : null}
          </p>
        </div>
        {st?.hasChanges ? (
          <ConfirmAction
            action={discardDraftAction}
            fields={{ key: section.key }}
            title="Descartar borrador"
            description="Se perderán los cambios guardados sin publicar de esta sección."
            confirmLabel="Descartar"
            triggerLabel="Descartar borrador"
            destructive
          />
        ) : null}
      </div>
      <ContentSectionEditor section={section.key} initial={draft[section.key] as unknown as Record<string, unknown>} />
    </div>
  );
}
