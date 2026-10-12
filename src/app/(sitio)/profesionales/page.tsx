import type { Metadata } from "next";
import { CtaBand, ProfessionalsSection } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";
import { listPublishedProfessionals } from "@/server/services/public-site";

export const metadata: Metadata = {
  title: "Profesionales",
  description: "Equipo de profesionales del CMIO, Centro de Manejo Integral de la Obesidad, Capiatá.",
  alternates: { canonical: "/profesionales" },
};

export default async function ProfessionalsPage() {
  const [{ landing, institution }, professionals] = await Promise.all([getSiteContent("published"), listPublishedProfessionals()]);
  return (
    <>
      <ProfessionalsSection section={landing.professionals} professionals={professionals} headingLevel="h1" />
      <CtaBand cta={landing.ctaBand} institution={institution} />
    </>
  );
}
