import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/server/auth/current";
import { listProfessionalsAdmin } from "@/server/services/catalog";
import { professionalDisplayName } from "@/server/services/public-site";
import { PROFESSIONAL_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "Profesionales" };

export default async function ProfessionalsAdminPage() {
  const actor = await requirePermission("catalogo.gestionar");
  const items = await listProfessionalsAdmin(actor);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profesionales"
        description="Perfiles, credenciales verificadas, servicios, disponibilidad y publicación."
        actions={<ButtonLink href="/panel/profesionales/nuevo" icon={<UserPlus className="size-4" aria-hidden="true" />}>Nuevo perfil</ButtonLink>}
      />
      <Card>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((p) => (
              <li key={p.id}>
                <Link href={`/panel/profesionales/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-primary-soft/40">
                  <span>
                    <span className="font-semibold text-ink">{professionalDisplayName(p)}</span>
                    <span className="block text-sm text-muted">
                      {p.specialties.map((s) => s.specialty.name).join(" · ") || "Sin especialidad"} · {p._count.services} servicio(s) ·{" "}
                      {p._count.scheduleRules ? `${p._count.scheduleRules} bloque(s) semanales` : "sin disponibilidad"}
                      {p.user ? ` · cuenta: ${p.user.email}` : " · sin cuenta"}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={p.status === "ACTIVE" ? "success" : p.status === "DRAFT" ? "warning" : "neutral"}>{PROFESSIONAL_STATUS_LABELS[p.status]}</Badge>
                    {p.isPublished ? <Badge tone="primary">Publicado</Badge> : <Badge>No publicado</Badge>}
                    {p.credentialsVerifiedAt ? <Badge tone="info">Credenciales verificadas</Badge> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todavía no hay profesionales" description="Crea el primer perfil. Puedes completarlo y publicarlo cuando tengas los datos verificados." action={<ButtonLink href="/panel/profesionales/nuevo">Nuevo perfil</ButtonLink>} />
        )}
      </Card>
    </div>
  );
}
