import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  AboutSection,
  AnnouncementBar,
  ContactSection,
  CtaBand,
  FaqSection,
  HeroSection,
  findFeaturedProfessional,
  ProfessionalsSection,
  ServicesSection,
  SpecialtiesSection,
  StepsSection,
} from "@/components/site/sections";
import { BrandStyle } from "@/components/brand/brand-style";
import { requirePermission } from "@/server/auth/current";
import { getSiteContent } from "@/server/services/settings";
import { listPublicServices, listPublishedFaqs, listPublishedProfessionals, listPublishedSpecialties } from "@/server/services/public-site";
import { telHref, whatsappHref } from "@/lib/site-content";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

/** Vista previa del sitio con el contenido en borrador (solo para quien gestiona contenido). */
export default async function PreviewPage() {
  await requirePermission("contenido.gestionar");
  const [{ landing, institution, branding, announcement }, specialties, services, professionals, faqs] = await Promise.all([
    getSiteContent("draft"),
    listPublishedSpecialties(),
    listPublicServices(),
    listPublishedProfessionals(),
    listPublishedFaqs(),
  ]);
  const phone = institution.phones[0]?.number ?? null;
  return (
    <div className="preview-root flex min-h-dvh flex-col">
      <BrandStyle branding={branding} selector=".preview-root" />
      <div className="sticky top-0 z-50 bg-ink px-4 py-2 text-center text-sm font-medium text-white">
        Vista previa del borrador. Los visitantes ven la versión publicada.{" "}
        <a href="/panel/contenido" className="underline">
          Volver al editor
        </a>
      </div>
      {announcement.enabled && announcement.text ? <AnnouncementBar text={announcement.text} linkLabel={announcement.linkLabel} linkHref={announcement.linkHref} /> : null}
      <SiteHeader
        shortName={institution.shortName}
        subtitle={institution.name}
        logoPath={branding.logoPath}
        logoAlt={branding.logoAlt}
        phoneHref={phone ? telHref(phone) : null}
        phoneLabel={phone}
        whatsappHref={institution.whatsappNumber ? whatsappHref(institution.whatsappNumber) : null}
        portalHref="/ingresar"
        portalLabel="Acceso de pacientes"
      />
      <main id="contenido" className="flex-1">
        <HeroSection
          hero={landing.hero}
          institution={institution}
          specialtyCount={specialties.length}
          featured={findFeaturedProfessional(landing.hero, professionals)}
        />
        <AboutSection about={landing.about} />
        <SpecialtiesSection section={landing.specialties} specialties={specialties} />
        <StepsSection steps={landing.steps} />
        <ServicesSection section={landing.services} services={services} limit={6} />
        <ProfessionalsSection section={landing.professionals} professionals={professionals} />
        <CtaBand cta={landing.ctaBand} institution={institution} />
        <FaqSection section={landing.faq} faqs={faqs} />
        <ContactSection section={landing.contact} institution={institution} showForm={false} />
      </main>
      <SiteFooter institution={institution} branding={branding} specialties={specialties.map((s) => ({ slug: s.slug, name: s.name }))} />
    </div>
  );
}
