import type { Metadata } from "next";
import { ContactSection } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Ubicación y contacto",
  description: "Dirección, teléfonos, WhatsApp y horarios del CMIO en Capiatá, Paraguay.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactPage() {
  const { landing, institution } = await getSiteContent("published");
  return <ContactSection section={landing.contact} institution={institution} headingLevel="h1" />;
}
