import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sin permiso" };

export default function NoPermissionPage() {
  return (
    <div className="rounded-card border border-line bg-surface">
      <EmptyState
        icon={<ShieldAlert className="size-6" aria-hidden="true" />}
        title="No tienes permiso para acceder a esta sección"
        description="Si necesitas acceso, solicítalo al propietario o al administrador de la clínica."
        action={<ButtonLink href="/panel">Volver al inicio</ButtonLink>}
      />
    </div>
  );
}
