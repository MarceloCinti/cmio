import Link from "next/link";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/form";
import { Pagination } from "@/components/panel/pagination";
import { requireStaff } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { searchPatients } from "@/server/services/patients";
import { ageFromBirthDate, formatDateTime } from "@/lib/format";
import { redirect } from "next/navigation";

export const metadata = { title: "Pacientes" };

export default async function PatientsPage({ searchParams }: PageProps<"/panel/pacientes">) {
  const actor = await requireStaff();
  if (!can(actor, "pacientes.ver") && !can(actor, "citas.gestionar") && !actor.professionalId) redirect("/panel/sin-permiso");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Number(sp.pagina) || 1;
  const result = await searchPatients(actor, { q, page });
  const canCreate = can(actor, "pacientes.gestionar");

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description={can(actor, "pacientes.ver") ? "Busca por nombre, apellido, documento o teléfono." : "Pacientes con los que tienes relación de atención."}
        actions={canCreate ? <ButtonLink href="/panel/pacientes/nuevo" icon={<UserPlus className="size-4" aria-hidden="true" />}>Registrar paciente</ButtonLink> : null}
      />
      <form role="search" className="mb-5 flex gap-2" action="/panel/pacientes">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar paciente</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" type="search" defaultValue={q} placeholder="Nombre, documento o teléfono" className={`${inputClasses} pl-9`} />
        </label>
        <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-strong">
          Buscar
        </button>
      </form>
      <Card>
        {result.items.length ? (
          <>
            <table className="hidden w-full text-left text-sm md:table">
              <caption className="sr-only">Listado de pacientes</caption>
              <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Paciente</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Documento</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Teléfono</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Próxima cita</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Portal</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((p) => (
                  <tr key={p.id} className="hover:bg-primary-soft/40">
                    <td className="px-5 py-3">
                      <Link href={`/panel/pacientes/${p.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                        {p.lastName}, {p.firstName}
                      </Link>
                      {p.birthDate ? <span className="block text-xs text-muted">{ageFromBirthDate(p.birthDate)} años</span> : null}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{p.documentNumber ?? "—"}</td>
                    <td className="px-5 py-3">{p.phone ?? "—"}</td>
                    <td className="px-5 py-3">{p.appointments[0] ? formatDateTime(p.appointments[0].startsAt) : <span className="text-muted">—</span>}</td>
                    <td className="px-5 py-3">{p.userId ? <Badge tone="primary">Con acceso</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/panel/pacientes/${p.id}`} className="font-semibold text-primary hover:underline">
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {result.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/panel/pacientes/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {p.lastName}, {p.firstName}
                      </p>
                      <p className="text-sm text-muted">
                        {[p.documentNumber ? `CI ${p.documentNumber}` : null, p.phone].filter(Boolean).join(" · ")}
                      </p>
                      {p.appointments[0] ? <p className="text-xs text-primary">Próxima cita: {formatDateTime(p.appointments[0].startsAt)}</p> : null}
                    </div>
                    <ChevronRight className="size-5 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={result.page} pages={result.pages} total={result.total} basePath="/panel/pacientes" params={{ q }} />
          </>
        ) : (
          <EmptyState
            icon={<Users className="size-6" aria-hidden="true" />}
            title={q ? "No encontramos pacientes con esa búsqueda" : "Todavía no hay pacientes registrados"}
            description={q ? "Revisa la ortografía o busca por número de documento o teléfono." : "Registra al primer paciente para comenzar a agendar citas."}
            action={canCreate ? <ButtonLink href="/panel/pacientes/nuevo">Registrar paciente</ButtonLink> : null}
          />
        )}
      </Card>
    </div>
  );
}
