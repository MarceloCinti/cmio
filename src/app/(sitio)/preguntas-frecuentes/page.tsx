import type { Metadata } from "next";
import { FaqSection } from "@/components/site/sections";
import { getSiteContent } from "@/server/services/settings";
import { listPublishedFaqs } from "@/server/services/public-site";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Cómo solicitar una cita, registrarte, cancelar o reprogramar y acceder al portal de pacientes del CMIO.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

export default async function FaqPage() {
  const [{ landing }, faqs] = await Promise.all([getSiteContent("published"), listPublishedFaqs()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      {faqs.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      ) : null}
      <FaqSection section={landing.faq} faqs={faqs} headingLevel="h1" />
    </>
  );
}
