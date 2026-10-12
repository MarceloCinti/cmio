import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { requireStaff } from "@/server/auth/current";
import { ROLE_LABELS, PERMISSIONS } from "@/lib/permissions";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const actor = await requireStaff();
  const perms = actor.role === "OWNER" ? ["Todos los permisos (propietario)"] : [...actor.permissions].map((p) => PERMISSIONS[p]);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mi cuenta" />
      <Card>
        <CardHeader title="Datos de la cuenta" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Nombre</dt>
              <dd className="font-medium text-ink">{actor.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Correo</dt>
              <dd className="font-medium text-ink">{actor.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Rol</dt>
              <dd className="font-medium text-ink">{ROLE_LABELS[actor.role]}</dd>
            </div>
            <div>
              <dt className="text-muted">Acceso clínico</dt>
              <dd className="font-medium text-ink">{actor.professionalId ? "Sí (perfil profesional activo)" : "No"}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Permisos</p>
            {perms.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {perms.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">Sin permisos administrativos.</p>
            )}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Cambiar contraseña" description="Al cambiarla se cerrarán tus sesiones en otros dispositivos." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
