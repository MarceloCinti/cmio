import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/server/services/settings";

export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

export default async function PrivacidadPage() {
  const { legal } = await getSiteContent("published");
  return <LegalPage title="Política de privacidad" text={legal.privacy} reviewed={legal.reviewedByLegalCounsel} version={legal.policyVersion} />;
}
