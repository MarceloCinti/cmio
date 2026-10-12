import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, MessageCircle, Phone, UserPlus } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { AppointmentRequestForm } from "@/components/site/appointment-request-form";
import { getSiteContent } from "@/server/services/settings";
import { listPublishedSpecialties } from "@/server/services/public-site";
import { getCurrentActor } from "@/server/auth/current";
import { telHref, whatsappHref } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Solicitar una cita",
  description: "Agenda tu consulta en el CMIO de Capiatá en línea, por teléfono, por WhatsApp o enviando una solicitud.",
  alternates: { canonical: "/solicitar-cita" },
};

export default async function RequestAppointmentPage({ searchParams }: PageProps<"/solicitar-cita">) {
  const sp = await searchParams;
  const preselect = typeof sp.especialidad === "string" ? sp.especialidad : undefined;
  const [{ institution }, specialties, actor] = await Promise.all([getSiteContent("published"), listPublishedSpecialties(), getCurrentActor()]);
  const specialty = specialties.find((s) => s.slug === preselect);
  const bookingHref = `/portal/citas/nueva${specialty ? `?especialidad=${specialty.id}` : ""}`;
  const phone = institution.phones[0]?.number;
  const wa = institution.whatsappNumber ? whatsappHref(institution.whatsappNumber, "Hola, quisiera solicitar una cita.") : null;

  return (
    <>
      <PageHero
        title="Solicitar una cita"
        intro="Elige la opción que te resulte más cómoda. La reserva en línea muestra los horarios disponibles en tiempo real."
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border-2 border-primary bg-surface p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarCheck className="size-6" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-ink">Reservar en línea</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Desde el portal del paciente eliges especialidad, profesional, fecha y horario. Recibirás la confirmación al instante.
            </p>
            {actor?.role === "PATIENT" ? (
              <ButtonLink href={bookingHref} className="mt-5 w-full" size="lg">
                Elegir fecha y horario
              </ButtonLink>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ButtonLink href={`/registro?siguiente=${encodeURIComponent(bookingHref)}`} size="lg" icon={<UserPlus className="size-5" aria-hidden="true" />}>
                  Crear cuenta
                </ButtonLink>
                <ButtonLink href={`/ingresar?siguiente=${encodeURIComponent(bookingHref)}`} size="lg" variant="outline">
                  Ya tengo cuenta
                </ButtonLink>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink">Por teléfono o WhatsApp</h2>
            <p className="mt-2 text-sm text-muted">
              {institution.hours.map((h) => `${h.days}, ${h.hours}`).join(" · ")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {phone && telHref(phone) ? (
                <a href={telHref(phone)!} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-strong">
                  <Phone className="size-5" aria-hidden="true" /> {phone}
                </a>
              ) : null}
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong px-4 font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  <MessageCircle className="size-5" aria-hidden="true" /> WhatsApp
                </a>
              ) : null}
            </div>
          </section>
          {actor && actor.role !== "PATIENT" ? (
            <p className="text-sm text-muted">
              Estás conectado como personal de la clínica. Para agendar a un paciente usa la{" "}
              <Link className="font-semibold text-primary underline" href="/panel/citas/nueva">
                agenda del panel
              </Link>
              .
            </p>
          ) : null}
        </div>
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Enviar una solicitud</h2>
          <p className="mt-2 text-sm text-muted">
            Si prefieres que te contactemos, déjanos tus datos y la secretaría coordinará contigo el horario. Esta solicitud todavía no reserva un turno.
          </p>
          <div className="mt-5">
            <AppointmentRequestForm specialties={specialties.map((s) => ({ value: s.id, label: s.name }))} defaultSpecialtyId={specialty?.id} />
          </div>
        </section>
      </div>
    </>
  );
}
