import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatGuaranies } from "@/lib/format";
import { telHref, whatsappHref, type Institution, type Landing } from "@/lib/site-content";
import { SERVICE_CATEGORY_LABELS } from "@/lib/labels";
import { ContactForm } from "./contact-form";
import { MapEmbed } from "./map-embed";
import { InstagramIcon, socialHandle } from "@/components/site/social";
import { stockImageByPath } from "@/lib/images";
import type { FeaturedProfessional } from "@/lib/featured-professional";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Heading = "h2",
  id,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="mb-3 text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p> : null}
      <Heading id={id} className="text-3xl font-bold text-ink sm:text-4xl">
        {title}
      </Heading>
      {intro ? <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────

export function HeroSection({
  hero,
  institution,
  specialtyCount,
  featured = null,
}: {
  hero: Landing["hero"];
  institution: Institution;
  specialtyCount: number;
  featured?: FeaturedProfessional | null;
}) {
  const hours = institution.hours[0];
  // Una imagen de banco nunca se rotula con el nombre de una persona: se aclara que es ilustrativa.
  const illustrative = Boolean(stockImageByPath(hero.imagePath));
  const photoNote = illustrative ? "Imagen ilustrativa" : hero.imageCaption;
  return (
    <section aria-labelledby="hero-titulo" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand-wellness) 22%, transparent), transparent)" }}
      />
      <div className="container-page relative grid items-center gap-10 pt-8 pb-14 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-16 lg:pb-24">
        <div>
          {hero.eyebrow ? (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-tint bg-surface px-3 py-1.5 text-xs font-semibold text-primary sm:text-sm">
              <HeartPulse className="size-4" aria-hidden="true" />
              {hero.eyebrow}
            </p>
          ) : null}
          <h1 id="hero-titulo" className="text-[2.15rem] leading-[1.1] font-extrabold text-ink sm:text-5xl lg:text-[3.4rem]">
            {hero.title}
          </h1>
          {hero.subtitle ? <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{hero.subtitle}</p> : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/solicitar-cita" size="lg" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
              {hero.primaryCta}
            </ButtonLink>
            <ButtonLink href="/servicios" variant="outline" size="lg">
              {hero.secondaryCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <ul className="mt-9 grid gap-3 text-sm text-ink sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" />
              Atención multidisciplinaria
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
              Agenda en línea
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              Datos protegidos
            </li>
          </ul>
          {featured ? (
            // Fuera de la foto: la foto puede ser ilustrativa y no debe asociarse a un profesional real.
            <Link
              href={`/profesionales/${featured.slug}`}
              className="group mt-8 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface py-2 pr-4 pl-2 shadow-soft transition hover:border-primary sm:w-fit sm:max-w-sm"
            >
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-bold text-primary">
                {featured.photoPath ? (
                  <Image src={featured.photoPath} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span aria-hidden="true">{featured.initials}</span>
                )}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="line-clamp-2 text-sm font-semibold text-ink">{featured.name}</span>
                {featured.role ? <span className="mt-0.5 line-clamp-2 text-xs text-muted">{featured.role}</span> : null}
              </span>
              <ArrowRight className="size-4 shrink-0 text-primary transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-primary-soft shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]">
            {/* «sizes» considera el recorte: una foto apaisada en el recuadro vertical se ve ~1,9 veces más ancha. */}
            <Image
              src={hero.imagePath}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(min-width: 1180px) 1010px, (min-width: 1024px) 82vw, 120vw"
              className="object-cover object-[60%_22%]"
            />
            {photoNote ? (
              <span
                className={cn(
                  "absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs backdrop-blur",
                  illustrative ? "bg-ink/60 font-medium text-white" : "bg-surface/90 font-semibold text-ink shadow-soft",
                )}
              >
                {photoNote}
              </span>
            ) : null}
          </div>
          {hours ? (
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur sm:left-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm leading-tight">
                <span className="block font-semibold text-ink">{hours.days}</span>
                <span className="text-muted">{hours.hours}</span>
              </span>
            </div>
          ) : null}
          {specialtyCount > 0 ? (
            <div
              className={cn(
                "absolute top-4 right-4 hidden rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur sm:block",
                // Entre 1024 y 1279 px la foto es angosta: baja para no tapar el aviso de la esquina superior.
                photoNote && "lg:top-14 xl:top-4",
              )}
            >
              <span className="block text-2xl font-extrabold text-primary">{specialtyCount}</span>
              <span className="text-xs font-medium text-muted">especialidades en un mismo lugar</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// La clínica
// ─────────────────────────────────────────────────────────────

export function AboutSection({ about, headingLevel = "h2" }: { about: Landing["about"]; headingLevel?: "h1" | "h2" }) {
  const blocks = about.blocks.filter((b) => b.visible);
  const [first, ...rest] = blocks;
  return (
    <section id="la-clinica" aria-labelledby="clinica-titulo" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionHeading eyebrow="Quiénes somos" title={about.title} intro={about.intro} as={headingLevel} id="clinica-titulo" />
            {first ? (
              <div className="mt-8 rounded-2xl border-l-4 border-primary bg-primary-soft p-5">
                <h3 className="font-semibold text-ink">{first.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/85">{first.body}</p>
              </div>
            ) : null}
          </div>
          {about.imagePath ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] shadow-soft">
              <Image src={about.imagePath} alt={about.imageAlt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
            </div>
          ) : null}
        </div>
        {rest.length ? (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rest.map((b) => (
              <li key={b.key} className="rounded-2xl border border-line bg-canvas p-5">
                <h3 className="font-semibold text-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
                  {b.key === "valores" ? b.body.split("·").map((v) => v.trim()).filter(Boolean).join("\n") : b.body}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Especialidades
// ─────────────────────────────────────────────────────────────

type SpecialtyCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  imagePath: string | null;
  imageAlt: string | null;
  professionals: { professional: { id: string; honorific: string | null; firstName: string; lastName: string } }[];
  services: { id: string; name: string }[];
};

export function SpecialtiesSection({ section, specialties }: { section: Landing["specialties"]; specialties: SpecialtyCard[] }) {
  return (
    <section id="especialidades" aria-labelledby="especialidades-titulo" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Equipo multidisciplinario" title={section.title} intro={section.intro} id="especialidades-titulo" />
          <Link href="/especialidades" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Ver todas <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <SpecialtyGrid specialties={specialties} />
      </div>
    </section>
  );
}

export function SpecialtyGrid({ specialties }: { specialties: SpecialtyCard[] }) {
  if (!specialties.length) {
    return <p className="mt-10 text-muted">Pronto publicaremos las especialidades disponibles.</p>;
  }
  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {specialties.map((s) => (
        <li key={s.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift">
          <div className="relative aspect-[16/10] overflow-hidden bg-primary-soft">
            {s.imagePath ? (
              <Image
                src={s.imagePath}
                alt={s.imageAlt ?? ""}
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-primary">
                <Stethoscope className="size-10" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="text-xl font-bold text-ink">
              <Link href={`/especialidades/${s.slug}`} className="after:absolute after:inset-0 focus:outline-none">
                {s.name}
              </Link>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.summary}</p>
            {s.professionals.length ? (
              <p className="mt-3 text-xs font-medium text-primary">
                {s.professionals.length === 1 ? "1 profesional" : `${s.professionals.length} profesionales`}
              </p>
            ) : null}
            <div className="relative z-10 mt-5 flex flex-wrap gap-2">
              <ButtonLink href={`/solicitar-cita?especialidad=${s.slug}`} size="sm" variant="subtle" icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
                Solicitar una cita
              </ButtonLink>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// Cómo funciona
// ─────────────────────────────────────────────────────────────

const STEP_ICONS = [CalendarPlus, UserCheck, MapPin, Stethoscope, ClipboardCheck];

export function StepsSection({ steps }: { steps: Landing["steps"] }) {
  return (
    <section aria-labelledby="pasos-titulo" className="bg-ink py-16 text-white sm:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-white/70 uppercase">Paso a paso</p>
          <h2 id="pasos-titulo" className="text-3xl font-bold sm:text-4xl">
            {steps.title}
          </h2>
          {steps.intro ? <p className="mt-4 text-lg leading-relaxed text-white/75">{steps.intro}</p> : null}
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {steps.items.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <li key={i} className="relative rounded-2xl border border-white/12 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white text-sm font-bold text-ink">{i + 1}</span>
                  <Icon className="size-5 text-white/70" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold leading-snug">{step.title}</h3>
                {step.body ? <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Servicios
// ─────────────────────────────────────────────────────────────

type ServiceCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: keyof typeof SERVICE_CATEGORY_LABELS;
  durationMinutes: number;
  bookableOnline: boolean;
  price: number | null;
  showPrice: boolean;
  imagePath: string | null;
  imageAlt: string | null;
  preparationNotes: string | null;
  specialty: { name: string; slug: string } | null;
};

export function ServicesSection({
  section,
  services,
  limit,
  headingLevel = "h2",
}: {
  section: Landing["services"];
  services: ServiceCard[];
  limit?: number;
  headingLevel?: "h1" | "h2";
}) {
  const shown = limit ? services.slice(0, limit) : services;
  return (
    <section id="servicios" aria-labelledby="servicios-titulo" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Prestaciones" title={section.title} intro={section.intro} as={headingLevel} id="servicios-titulo" />
          {limit && services.length > limit ? (
            <Link href="/servicios" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Ver todos <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {shown.length ? (
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {shown.map((s) => (
              <li key={s.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
                <div className="relative hidden aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-primary-soft xs:block">
                  {s.imagePath ? (
                    <Image src={s.imagePath} alt={s.imageAlt ?? ""} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary">
                      <Stethoscope className="size-8" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{SERVICE_CATEGORY_LABELS[s.category]}</Badge>
                    {/* La duración solo se informa en servicios con turnos (en cirugías depende de cada caso). */}
                    {s.bookableOnline ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Clock className="size-3.5" aria-hidden="true" /> {s.durationMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{s.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.summary}</p>
                  {s.preparationNotes ? <p className="mt-2 text-xs text-ink/80">Preparación: {s.preparationNotes}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {s.showPrice && s.price != null ? (
                      <span className="text-sm font-semibold text-ink">{formatGuaranies(s.price)}</span>
                    ) : (
                      <span className="text-xs text-muted">Consulta el arancel en secretaría</span>
                    )}
                    <Link
                      href={`/solicitar-cita${s.specialty ? `?especialidad=${s.specialty.slug}` : ""}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      Solicitar <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-muted">
            Estamos actualizando el detalle de nuestros servicios. Comunícate con la secretaría para conocer las prestaciones disponibles.
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Profesionales
// ─────────────────────────────────────────────────────────────

type ProfessionalCard = {
  id: string;
  slug: string;
  honorific: string | null;
  firstName: string;
  lastName: string;
  photoPath: string | null;
  bio: string | null;
  acceptsOnlineBooking: boolean;
  specialties: { specialty: { name: string; slug: string; isPublished: boolean } }[];
};

export function ProfessionalsSection({
  section,
  professionals,
  headingLevel = "h2",
}: {
  section: Landing["professionals"];
  professionals: ProfessionalCard[];
  headingLevel?: "h1" | "h2";
}) {
  return (
    <section id="profesionales" aria-labelledby="profesionales-titulo" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Nuestro equipo" title={section.title} intro={section.intro} as={headingLevel} id="profesionales-titulo" />
        {professionals.length ? (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((p) => {
              const name = [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" ");
              const initials = `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
              return (
                <li key={p.id} className="flex flex-col rounded-2xl border border-line bg-canvas p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-primary-soft">
                      {p.photoPath ? (
                        <Image src={p.photoPath} alt={`Fotografía de ${name}`} fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-lg font-bold text-primary" aria-hidden="true">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink">{name}</h3>
                      <p className="text-sm text-muted">
                        {p.specialties
                          .filter((s) => s.specialty.isPublished)
                          .map((s) => s.specialty.name)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {p.bio ? <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{p.bio}</p> : <div className="flex-1" />}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <ButtonLink href={`/profesionales/${p.slug}`} size="sm" variant="outline">
                      Ver perfil
                    </ButtonLink>
                    {p.acceptsOnlineBooking ? (
                      <ButtonLink href={`/portal/citas/nueva?profesional=${p.id}`} size="sm" variant="subtle" icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
                        Agendar
                      </ButtonLink>
                    ) : (
                      <ButtonLink href="/solicitar-cita" size="sm" variant="subtle" icon={<CalendarPlus className="size-4" aria-hidden="true" />}>
                        Solicitar cita
                      </ButtonLink>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-muted">{section.emptyText}</p>
            <ButtonLink href="/solicitar-cita" variant="subtle" size="md">
              Solicitar una cita
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Llamado a la acción
// ─────────────────────────────────────────────────────────────

export function CtaBand({ cta, institution }: { cta: Landing["ctaBand"]; institution: Institution }) {
  const wa = institution.whatsappNumber ? whatsappHref(institution.whatsappNumber, "Hola, quisiera solicitar una cita.") : null;
  return (
    <section aria-labelledby="cta-titulo" className="py-16 sm:py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-primary text-white shadow-lift">
          {cta.imagePath ? (
            <Image src={cta.imagePath} alt={cta.imageAlt} fill sizes="100vw" className="object-cover opacity-25 mix-blend-luminosity" />
          ) : null}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "linear-gradient(110deg, var(--brand-primary) 35%, color-mix(in oklab, var(--brand-primary) 55%, transparent))" }}
          />
          <div className="relative grid gap-6 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 id="cta-titulo" className="text-3xl font-bold sm:text-4xl">
                {cta.title}
              </h2>
              {cta.body ? <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85">{cta.body}</p> : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <ButtonLink href="/solicitar-cita" size="lg" className="bg-white text-primary hover:bg-white/90" icon={<CalendarPlus className="size-5" aria-hidden="true" />}>
                {cta.button}
              </ButtonLink>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 px-6 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <MessageCircle className="size-5" aria-hidden="true" /> WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Preguntas frecuentes
// ─────────────────────────────────────────────────────────────

export function FaqSection({
  section,
  faqs,
  headingLevel = "h2",
}: {
  section: Landing["faq"];
  faqs: { id: string; question: string; answer: string }[];
  headingLevel?: "h1" | "h2";
}) {
  return (
    <section id="preguntas" aria-labelledby="faq-titulo" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading eyebrow="Ayuda" title={section.title} intro={section.intro} as={headingLevel} id="faq-titulo" />
        {faqs.length ? (
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {faqs.map((f) => (
              <details key={f.id} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left font-semibold text-ink">
                  {f.question}
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed whitespace-pre-line text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-muted">Todavía no hay preguntas publicadas.</p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Contacto
// ─────────────────────────────────────────────────────────────

export function ContactSection({
  section,
  institution,
  headingLevel = "h2",
  showForm = true,
}: {
  section: Landing["contact"];
  institution: Institution;
  headingLevel?: "h1" | "h2";
  showForm?: boolean;
}) {
  const wa = institution.whatsappNumber ? whatsappHref(institution.whatsappNumber, "Hola, tengo una consulta.") : null;
  return (
    <section id="contacto" aria-labelledby="contacto-titulo" className="scroll-mt-20 bg-surface py-16 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Estamos para ayudarte" title={section.title} intro={section.intro} as={headingLevel} id="contacto-titulo" />
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-canvas p-5 sm:p-6">
              <dl className="space-y-5">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-semibold text-ink">Dirección</dt>
                    <dd className="text-sm text-muted">
                      {institution.address}
                      {institution.addressReference ? (
                        <>
                          <br />
                          {institution.addressReference}
                        </>
                      ) : null}
                      <br />
                      {institution.city}, {institution.country}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-semibold text-ink">Horario de atención</dt>
                    <dd className="text-sm text-muted">
                      {institution.hours.map((h) => (
                        <span key={h.days} className="block">
                          {h.days}: {h.hours}
                        </span>
                      ))}
                      {institution.hoursNote ? <span className="mt-1 block text-xs">{institution.hoursNote}</span> : null}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="text-sm font-semibold text-ink">Teléfonos</dt>
                    <dd className="text-sm text-muted">
                      {institution.phones.map((p) => {
                        const href = telHref(p.number);
                        return (
                          <span key={p.number} className="block">
                            {p.label}:{" "}
                            {href ? (
                              <a href={href} className="font-medium text-primary hover:underline">
                                {p.number}
                              </a>
                            ) : (
                              p.number
                            )}
                          </span>
                        );
                      })}
                    </dd>
                  </div>
                </div>
                {institution.instagramUrl ? (
                  <div className="flex gap-3">
                    <InstagramIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <dt className="text-sm font-semibold text-ink">Redes sociales</dt>
                      <dd className="text-sm text-muted">
                        <a href={institution.instagramUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          Instagram {socialHandle(institution.instagramUrl)}
                        </a>
                        <span className="block text-xs">Novedades, consejos de salud y videos de nuestros profesionales.</span>
                      </dd>
                    </div>
                  </div>
                ) : null}
              </dl>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {institution.phones[0] && telHref(institution.phones[0].number) ? (
                  <a
                    href={telHref(institution.phones[0].number)!}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-strong"
                  >
                    <Phone className="size-5" aria-hidden="true" /> Llamar ahora
                  </a>
                ) : null}
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-semibold text-ink hover:border-primary hover:text-primary"
                  >
                    <MessageCircle className="size-5" aria-hidden="true" /> Escribir por WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
            <MapEmbed query={institution.mapQuery} latitude={institution.latitude} longitude={institution.longitude} />
          </div>
          {showForm ? (
            <div className="rounded-2xl border border-line bg-canvas p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-ink">Envíanos un mensaje</h3>
              <p className="mt-1 text-sm text-muted">
                Responderemos en horario de atención. No incluyas información médica sensible en este formulario.
              </p>
              <div className="mt-5">
                <ContactForm />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function AnnouncementBar({ text, linkLabel, linkHref }: { text: string; linkLabel: string; linkHref: string }) {
  return (
    <div className="bg-primary text-white">
      <p className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm">
        <span>{text}</span>
        {linkHref && linkLabel ? (
          <Link href={linkHref} className="font-semibold underline underline-offset-2">
            {linkLabel}
          </Link>
        ) : null}
      </p>
    </div>
  );
}
