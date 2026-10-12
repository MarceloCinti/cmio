import { PageHeader } from "@/components/panel/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm, UserRowActions } from "@/components/panel/user-admin";
import { requirePermission } from "@/server/auth/current";
import { canAssignRole, listStaffUsers } from "@/server/services/users";
import { db } from "@/server/db";
import { ROLE_LABELS, ROLE_RANK, type RoleKey } from "@/lib/permissions";
import { USER_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Usuarios" };

const STAFF: RoleKey[] = ["OWNER", "ADMIN", "SECRETARY", "DOCTOR"];

export default async function UsersPage() {
  const actor = await requirePermission("usuarios.gestionar");
  const [users, freeProfessionals] = await Promise.all([
    listStaffUsers(actor),
    db.professional.findMany({ where: { userId: null }, orderBy: { lastName: "asc" }, select: { id: true, honorific: true, firstName: true, lastName: true } }),
  ]);
  const assignable = STAFF.filter((r) => canAssignRole(actor, r));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios del personal"
        description="Los roles privilegiados solo se asignan desde aquí. Nadie puede asignar un rol igual o superior al propio ni modificar su propio rol. Los pacientes se gestionan desde su ficha."
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={`Usuarios (${users.length})`} />
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const manageable = u.id !== actor.id && (actor.role === "OWNER" || ROLE_RANK[actor.role] > ROLE_RANK[u.role]);
              const locked = Boolean(u.lockedUntil && u.lockedUntil > new Date());
              return (
                <li key={u.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">
                        {u.name} {u.id === actor.id ? <span className="text-sm font-normal text-muted">(tú)</span> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {u.email} · {ROLE_LABELS[u.role]}
                        {u.professional ? ` · perfil: ${u.professional.firstName} ${u.professional.lastName}` : ""}
                      </p>
                      <p className="text-xs text-muted">{u.lastLoginAt ? `Último ingreso: ${formatDateTime(u.lastLoginAt)}` : "Nunca ingresó"}</p>
                    </div>
                    <span className="flex gap-1.5">
                      <Badge tone={u.status === "ACTIVE" ? "success" : u.status === "INVITED" ? "info" : u.status === "DISABLED" ? "danger" : "warning"}>{USER_STATUS_LABELS[u.status]}</Badge>
                      {locked ? <Badge tone="danger">Bloqueada</Badge> : null}
                    </span>
                  </div>
                  {manageable ? (
                    <UserRowActions id={u.id} name={u.name} role={u.role} status={u.status} locked={locked} assignableRoles={assignable} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Invitar a una persona" description="Recibirá un enlace para crear su contraseña." />
          <CardBody>
            <InviteUserForm
              roles={assignable}
              professionals={freeProfessionals.map((p) => ({ id: p.id, label: [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" ") }))}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
