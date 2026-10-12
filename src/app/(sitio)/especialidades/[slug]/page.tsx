import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Clock } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getPublishedSpecialty, professionalDisplayName } from "@/server/services/public-site";

export async function generateMetadata({ params }: PageProps<"/especialidades/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getPublishedSpecialty(slug);
  if (!s) return { title: "Especialidad no encontrada" };
  return {
    title: `${s.name} en Capiatá`,
    description: `${s.summary} Atención en el CMIO, Centro de Manejo Integral de la Obesidad, Capiatá.`,
    alternates: { canonical: `/especialidades/${s.slug}` },
    openGraph: s.imagePath ? { images: [{ url: s.imagePath, alt: s.imageAlt ?? s.name }] } : undefined,
  };
}

export default async function SpecialtyPage({ params }: PageProps<"/especialidades/[slug]">) {
  const { slug } = await params;
  const s = await getPublishedSpecialty(slug);
  if (!s) notFound();
  return (
    <>
      <PageHero title={s.name} intro={s.summary} crumbs={[{ href: "/especialidades", label: "Especialidades" }]} />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          {s.imagePath ? (
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-primary-soft">
              <Image src={s.imagePath} alt={s.imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          {s.description ? <p className="text-lg leading-relaxed text-ink/90">{s.description}</p> : null}
          <section aria-labelledby="servicios-especialidad">
            <h2 id="servicios-especialidad" className="text-xl font-bold text-ink">
              Servicios relacionados
            </h2>
            {s.services.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.services.map((svc) => (
                  <li key={svc.id} className="rounded-xl border border-line bg-surface p-4">
                    <p className="font-semibold text-ink">{svc.name}</p>
                    <p className="mt-1 text-sm text-muted">{svc.summary}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5" aria-hidden="true" /> {svc.durationMinutes} minutos aprox.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">Consulta con la secretaría por las prestaciones disponibles.</p>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">Solicita tu cita de {s.name.toLowerCase()}</h2>
            <p className="mt-2 text-sm text-muted">Reserva en línea según la disponibilidad real de la agenda o envía una solicitud a la secretaría.</p>
            <ButtonLink href={`/solicitar-cita?especialidad=${s.slug}`} className="mt-5 w-full" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
              Solicitar una cita
            </ButtonLink>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink">Profesionales</h2>
            {s.professionals.length ? (
              <ul className="mt-3 space-y-2">
                {s.professionals.map(({ professional: p }) => (
                  <li key={p.id}>
                    <Link href={`/profesionales/${p.slug}`} className="font-medium text-primary hover:underline">
                      {professionalDisplayName(p)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Próximamente publicaremos los perfiles de los profesionales de esta especialidad.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
