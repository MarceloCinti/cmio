import { redirect } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { RolePermissionsForm } from "@/components/panel/role-matrix";
import { requireStaff } from "@/server/auth/current";
import { getRolePermissionMatrix } from "@/server/services/users";
import { CONFIGURABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Roles y permisos" };

export default async function RolesPage() {
  const actor = await requireStaff();
  if (actor.role !== "OWNER") redirect("/panel/sin-permiso");
  const matrix = await getRolePermissionMatrix(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Roles y permisos" description="Define qué puede hacer cada rol. El propietario conserva siempre todos los permisos." />
      <Alert tone="info">
        El acceso a la historia clínica no es un permiso configurable: corresponde solo a profesionales de la salud con perfil activo y relación de atención con el paciente. Algunos permisos sensibles no pueden asignarse a ciertos roles (por ejemplo, la secretaría nunca exporta historias clínicas). Los cambios se aplican en el próximo acceso de cada persona.
      </Alert>
      <div className="grid gap-6 xl:grid-cols-3">
        {CONFIGURABLE_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader title={ROLE_LABELS[role]} description={ROLE_DESCRIPTIONS[role]} />
            <CardBody>
              <RolePermissionsForm role={role} granted={matrix[role]} />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
