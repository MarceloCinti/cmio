import type { Metadata } from "next";
import { AboutSection, CtaBand, StepsSection } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "La clínica",
  description: "Conoce el enfoque de atención integral del Centro de Manejo Integral de la Obesidad (CMIO) en Capiatá.",
  alternates: { canonical: "/la-clinica" },
};

export default async function ClinicPage() {
  const { landing, institution } = await getSiteContent("published");
  return (
    <>
      <AboutSection about={landing.about} headingLevel="h1" />
      <StepsSection steps={landing.steps} />
      <CtaBand cta={landing.ctaBand} institution={institution} />
    </>
  );
}
