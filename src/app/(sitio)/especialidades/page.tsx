import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { CtaBand, SpecialtyGrid } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";
import { listPublishedSpecialties } from "@/server/services/public-site";

export const metadata: Metadata = {
  title: "Especialidades",
  description:
    "Nutrición, clínica médica, endocrinología, cardiología y cirugía bariátrica y metabólica en el CMIO, Capiatá.",
  alternates: { canonical: "/especialidades" },
};

export default async function SpecialtiesPage() {
  const [{ landing, institution }, specialties] = await Promise.all([getSiteContent("published"), listPublishedSpecialties()]);
  return (
    <>
      <PageHero title={landing.specialties.title} intro={landing.specialties.intro} eyebrow="Equipo multidisciplinario" />
      <section className="container-page pb-6">
        <SpecialtyGrid specialties={specialties} />
      </section>
      <CtaBand cta={landing.ctaBand} institution={institution} />
    </>
  );
}
