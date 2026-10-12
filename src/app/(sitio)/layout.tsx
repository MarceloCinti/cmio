import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnnouncementBar } from "@/components/site/sections";
import { DemoBanner } from "@/components/demo-banner";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { getSiteContent } from "@/server/services/settings";
import { listPublishedSpecialties } from "@/server/services/public-site";
import { getCurrentActor } from "@/server/auth/current";
import { telHref, whatsappHref } from "@/lib/site-content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ institution, branding, announcement }, specialties, actor] = await Promise.all([
    getSiteContent("published"),
    listPublishedSpecialties(),
    getCurrentActor(),
  ]);
  const phone = institution.phones[0]?.number ?? null;
  const portalHref = actor ? (actor.role === "PATIENT" ? "/portal" : "/panel") : "/ingresar";
  const portalLabel = actor ? (actor.role === "PATIENT" ? "Mi portal" : "Ir al panel") : "Acceso de pacientes";

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      {announcement.enabled && announcement.text ? (
        <AnnouncementBar text={announcement.text} linkLabel={announcement.linkLabel} linkHref={announcement.linkHref} />
      ) : null}
      <SiteHeader
        shortName={institution.shortName}
        subtitle={institution.name}
        logoPath={branding.logoPath}
        logoAlt={branding.logoAlt}
        phoneHref={phone ? telHref(phone) : null}
        phoneLabel={phone}
        whatsappHref={institution.whatsappNumber ? whatsappHref(institution.whatsappNumber) : null}
        portalHref={portalHref}
        portalLabel={portalLabel}
      />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter institution={institution} branding={branding} specialties={specialties.map((s) => ({ slug: s.slug, name: s.name }))} />
      <div className="h-16 sm:hidden" aria-hidden="true" />
      <MobileActionBar
        phoneHref={phone ? telHref(phone) : null}
        whatsappHref={institution.whatsappNumber ? whatsappHref(institution.whatsappNumber) : null}
      />
    </div>
  );
}
