import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/server/services/settings";

export const metadata: Metadata = { title: "Términos de uso", alternates: { canonical: "/terminos" } };

export default async function TerminosPage() {
  const { legal } = await getSiteContent("published");
  return <LegalPage title="Términos de uso" text={legal.terms} reviewed={legal.reviewedByLegalCounsel} version={legal.policyVersion} />;
}
