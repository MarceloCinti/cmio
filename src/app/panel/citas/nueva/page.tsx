import { PageHeader } from "@/components/panel/page-header";
import { StaffBookingForm } from "@/components/appointments/staff-booking-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/current";
import { can } from "@/server/auth/actor";
import { getStaffBookingCatalog } from "@/server/services/booking-catalog";
import { db } from "@/server/db";
import { isValidISODate } from "@/lib/time";

export const metadata = { title: "Nueva cita" };

export default async function NewStaffAppointmentPage({ searchParams }: PageProps<"/panel/citas/nueva">) {
  const actor = await requirePermission("citas.gestionar");
  const sp = await searchParams;
  const catalog = await getStaffBookingCatalog();
  const patientId = typeof sp.paciente === "string" ? sp.paciente : null;
  const p = patientId ? await db.patient.findUnique({ where: { id: patientId }, select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true } }) : null;
  return (
    <div>
      <PageHeader back={{ href: "/panel/agenda", label: "Agenda" }} title="Nueva cita" description="Busca al paciente, elige profesional, servicio y horario disponible." />
      {catalog.professionals.length && catalog.services.length ? (
        <StaffBookingForm
          services={catalog.services}
          professionals={catalog.professionals}
          initialPatient={p ? { id: p.id, label: `${p.lastName}, ${p.firstName}`, detail: [p.documentNumber ? `CI ${p.documentNumber}` : null, p.phone].filter(Boolean).join(" · ") } : null}
          initialProfessionalId={typeof sp.profesional === "string" ? sp.profesional : undefined}
          initialDate={typeof sp.fecha === "string" && isValidISODate(sp.fecha) ? sp.fecha : undefined}
          canOverbook={can(actor, "citas.sobreturno")}
        />
      ) : (
        <Card>
          <EmptyState
            title="Todavía no hay agendas configuradas"
            description="Para agendar citas, registra al menos un profesional activo con servicios confirmados y su disponibilidad semanal."
            action={can(actor, "catalogo.gestionar") ? <ButtonLink href="/panel/profesionales">Configurar profesionales</ButtonLink> : null}
          />
        </Card>
      )}
    </div>
  );
}
