import { CalendarX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { BookingWizard } from "@/components/portal/booking-wizard";
import { requirePatient } from "@/server/auth/current";
import { getOnlineBookingCatalog } from "@/server/services/booking-catalog";
import { getSystemSetting } from "@/server/services/settings";

export const metadata = { title: "Agendar una consulta" };

export default async function NewAppointmentPage({ searchParams }: PageProps<"/portal/citas/nueva">) {
  await requirePatient();
  const sp = await searchParams;
  const [catalog, policy] = await Promise.all([getOnlineBookingCatalog(), getSystemSetting("booking")]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Agendar una consulta</h1>
        <p className="mt-1 text-muted">Los horarios que verás corresponden a la disponibilidad real de la agenda.</p>
      </div>
      {catalog.specialties.length ? (
        <BookingWizard
          specialties={catalog.specialties}
          professionals={catalog.professionals}
          initialSpecialtyId={typeof sp.especialidad === "string" ? sp.especialidad : undefined}
          initialProfessionalId={typeof sp.profesional === "string" ? sp.profesional : undefined}
          cancellationPolicy={policy.cancellationPolicyText}
          cancelMinHours={policy.patientCancelMinHours}
        />
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarX className="size-6" aria-hidden="true" />}
            title="La reserva en línea todavía no está disponible"
            description="La clínica aún no habilitó agendas para reservas en línea. Puedes enviar una solicitud y la secretaría se comunicará contigo."
            action={<ButtonLink href="/solicitar-cita">Solicitar una cita</ButtonLink>}
          />
        </Card>
      )}
    </div>
  );
}
