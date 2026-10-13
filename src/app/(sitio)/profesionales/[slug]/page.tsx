import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarPlus, Clock } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { WEEKDAY_LABELS, minutesToHHMM } from "@/lib/format";
import { getPublishedProfessional, professionalDisplayName } from "@/server/services/public-site";
import { getSiteContent } from "@/server/services/settings";

export async function generateMetadata({ params }: PageProps<"/profesionales/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProfessional(slug);
  if (!p) return { title: "Profesional no encontrado" };
  const specialties = p.specialties.map((s) => s.specialty.name).join(", ");
  const name = professionalDisplayName(p);
  const description = `${name}${specialties ? ` — ${specialties}` : ""}. CMIO, Capiatá.`;
  const { institution } = await getSiteContent("published");
  return {
    title: name,
    description,
    alternates: { canonical: `/profesionales/${p.slug}` },
    // La vista previa al compartir el perfil muestra al profesional, no la imagen de portada.
    openGraph: {
      type: "profile",
      locale: "es_PY",
      siteName: `${institution.shortName} — ${institution.name}`,
      title: name,
      description,
      images: p.photoPath ? [{ url: p.photoPath, alt: `Fotografía de ${name}` }] : [],
    },
    // Retrato cuadrado: tarjeta «summary» (la «large image» recortaría la cara).
    twitter: { card: "summary", title: name, description, images: p.photoPath ? [{ url: p.photoPath, alt: `Fotografía de ${name}` }] : [] },
  };
}

export default async function ProfessionalPage({ params }: PageProps<"/profesionales/[slug]">) {
  const { slug } = await params;
  const p = await getPublishedProfessional(slug);
  if (!p) notFound();
  const name = professionalDisplayName(p);
  const byDay = new Map<number, string[]>();
  for (const r of p.scheduleRules) {
    const list = byDay.get(r.weekday) ?? [];
    list.push(`${minutesToHHMM(r.startMinute)} a ${minutesToHHMM(r.endMinute)}`);
    byDay.set(r.weekday, list);
  }
  return (
    <>
      <PageHero title={name} intro={p.specialties.filter((s) => s.specialty.isPublished).map((s) => s.specialty.name).join(" · ")} crumbs={[{ href: "/profesionales", label: "Profesionales" }]} />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <div className="flex items-center gap-5">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-primary-soft">
              {p.photoPath ? (
                <Image src={p.photoPath} alt={`Fotografía de ${name}`} fill sizes="112px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-3xl font-bold text-primary" aria-hidden="true">
                  {p.firstName[0]}
                  {p.lastName[0]}
                </span>
              )}
            </div>
            {p.credentialsVerifiedAt && p.licenseNumber ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
                <BadgeCheck className="size-4" aria-hidden="true" /> Registro profesional: {p.licenseNumber}
              </p>
            ) : null}
          </div>
          {p.bio ? <p className="text-lg leading-relaxed whitespace-pre-line text-ink/90">{p.bio}</p> : null}
          {p.credentials && p.credentialsVerifiedAt ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Formación</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{p.credentials}</p>
            </section>
          ) : null}
          {p.services.length ? (
            <section>
              <h2 className="text-xl font-bold text-ink">Servicios</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.services.map(({ service }) => (
                  <li key={service.id} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink">
                    {service.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">Agenda con {name}</h2>
            <p className="mt-2 text-sm text-muted">
              {p.acceptsOnlineBooking
                ? "Elige fecha y horario según la disponibilidad real de su agenda."
                : "Por ahora su agenda se coordina con la secretaría. Envíanos tu solicitud y te contactamos para confirmar el horario."}
            </p>
            {p.acceptsOnlineBooking ? (
              <ButtonLink href={`/portal/citas/nueva?profesional=${p.id}`} className="mt-5 w-full" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
                Agendar en línea
              </ButtonLink>
            ) : (
              <ButtonLink href="/solicitar-cita" className="mt-5 w-full">
                Solicitar una cita
              </ButtonLink>
            )}
          </div>
          {byDay.size ? (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <Clock className="size-5 text-primary" aria-hidden="true" /> Horarios de atención
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {[...byDay.entries()].map(([day, ranges]) => (
                  <div key={day} className="flex justify-between gap-4">
                    <dt className="font-medium text-ink">{WEEKDAY_LABELS[day]}</dt>
                    <dd className="text-right text-muted">{ranges.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">Sujeto a feriados y ausencias programadas.</p>
            </div>
          ) : null}
          <p className="text-sm">
            <Link href="/profesionales" className="font-semibold text-primary hover:underline">
              ← Ver todos los profesionales
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
