import { PageHeader } from "@/components/panel/page-header";
import { ProfessionalForm } from "@/components/catalog/catalog-forms";
import { requirePermission } from "@/server/auth/current";
import { professionalFormOptions } from "@/server/services/professional-form-data";

export const metadata = { title: "Nuevo perfil profesional" };

export default async function NewProfessionalPage() {
  await requirePermission("catalogo.gestionar");
  const opts = await professionalFormOptions(null);
  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/panel/profesionales", label: "Profesionales" }}
        title="Nuevo perfil profesional"
        description="Carga solo datos verificados. El perfil no se publica hasta que lo apruebes."
      />
      <ProfessionalForm specialties={opts.specialties} services={opts.services} users={opts.users} />
    </div>
  );
}
