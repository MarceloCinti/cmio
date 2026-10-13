import {
  AboutSection,
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
import { getSiteContent } from "@/server/services/settings";
import {
  listPublicServices,
  listPublishedFaqs,
  listPublishedProfessionals,
  listPublishedSpecialties,
} from "@/server/services/public-site";
import { MedicalClinicJsonLd } from "@/components/site/json-ld";

export default async function HomePage() {
  const [{ landing, institution }, specialties, services, professionals, faqs] = await Promise.all([
    getSiteContent("published"),
    listPublishedSpecialties(),
    listPublicServices(),
    listPublishedProfessionals(),
    listPublishedFaqs(),
  ]);

  return (
    <>
      <MedicalClinicJsonLd institution={institution} specialties={specialties.map((s) => s.name)} />
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
      <ContactSection section={landing.contact} institution={institution} />
    </>
  );
}
