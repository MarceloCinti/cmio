import Link from "next/link";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { InstagramIcon, socialHandle } from "@/components/site/social";
import { telHref, whatsappHref, type Branding, type Institution } from "@/lib/site-content";

export function SiteFooter({
  institution,
  branding,
  specialties,
}: {
  institution: Institution;
  branding: Branding;
  specialties: { slug: string; name: string }[];
}) {
  const wa = institution.whatsappNumber ? whatsappHref(institution.whatsappNumber) : null;
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo logoPath={branding.logoPath} logoAlt={branding.logoAlt} shortName={institution.shortName} />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            {institution.name}. {institution.tagline}
          </p>
          <p className="flex items-start gap-2 text-sm text-ink">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {institution.address}
              {institution.addressReference ? `, ${institution.addressReference}` : ""}. {institution.city}, {institution.country}.
            </span>
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">Contacto</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {institution.phones.map((p) => {
              const href = telHref(p.number);
              return (
                <li key={p.number} className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  {href ? (
                    <a className="text-ink hover:text-primary hover:underline" href={href}>
                      {p.number}
                    </a>
                  ) : (
                    <span>{p.number}</span>
                  )}
                </li>
              );
            })}
            {wa ? (
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                <a className="text-ink hover:text-primary hover:underline" href={wa} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp
                </a>
              </li>
            ) : null}
            {institution.instagramUrl ? (
              <li className="flex items-center gap-2">
                <InstagramIcon className="size-4 text-primary" />
                <a className="text-ink hover:text-primary hover:underline" href={institution.instagramUrl} target="_blank" rel="noopener noreferrer">
                  Instagram {socialHandle(institution.instagramUrl)}
                </a>
              </li>
            ) : null}
            {institution.email ? (
              <li>
                <a className="text-ink hover:text-primary hover:underline" href={`mailto:${institution.email}`}>
                  {institution.email}
                </a>
              </li>
            ) : null}
          </ul>
          <h2 className="mt-6 text-sm font-semibold tracking-wide text-ink uppercase">Horarios</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {institution.hours.map((h) => (
              <li key={h.days} className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {h.days}: {h.hours}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">Especialidades</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {specialties.map((s) => (
              <li key={s.slug}>
                <Link href={`/especialidades/${s.slug}`} className="text-ink hover:text-primary hover:underline">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">Pacientes</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/solicitar-cita" className="text-ink hover:text-primary hover:underline">
                Solicitar una cita
              </Link>
            </li>
            <li>
              <Link href="/ingresar" className="text-ink hover:text-primary hover:underline">
                Acceso al portal
              </Link>
            </li>
            <li>
              <Link href="/registro" className="text-ink hover:text-primary hover:underline">
                Crear una cuenta
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" className="text-ink hover:text-primary hover:underline">
                Preguntas frecuentes
              </Link>
            </li>
          </ul>
          <h2 className="mt-6 text-sm font-semibold tracking-wide text-ink uppercase">Legal</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li>
              <Link href="/privacidad" className="text-ink hover:text-primary hover:underline">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/terminos" className="text-ink hover:text-primary hover:underline">
                Términos de uso
              </Link>
            </li>
            <li>
              <Link href="/tratamiento-de-datos" className="text-ink hover:text-primary hover:underline">
                Aviso de tratamiento de datos
              </Link>
            </li>
            <li>
              <Link href="/creditos" className="text-ink hover:text-primary hover:underline">
                Créditos de imágenes
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {institution.shortName} — {institution.name}. Todos los derechos reservados.
          </p>
          <p>Este sitio no atiende emergencias. Ante una urgencia, acude al servicio de emergencias más cercano.</p>
        </div>
      </div>
    </footer>
  );
}
