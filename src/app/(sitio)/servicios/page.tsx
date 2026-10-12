import type { Metadata } from "next";
import { CtaBand, ServicesSection } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";
import { listPublicServices } from "@/server/services/public-site";

export const metadata: Metadata = {
  title: "Servicios y estudios",
  description: "Consultas, evaluaciones y estudios disponibles en el CMIO, Centro de Manejo Integral de la Obesidad, Capiatá.",
  alternates: { canonical: "/servicios" },
};

export default async function ServicesPage() {
  const [{ landing, institution }, services] = await Promise.all([getSiteContent("published"), listPublicServices()]);
  return (
    <>
      <ServicesSection section={landing.services} services={services} headingLevel="h1" />
      <CtaBand cta={landing.ctaBand} institution={institution} />
    </>
  );
}
