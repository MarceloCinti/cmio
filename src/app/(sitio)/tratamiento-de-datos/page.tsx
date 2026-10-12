import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/server/services/settings";

export const metadata: Metadata = { title: "Aviso de tratamiento de datos personales", alternates: { canonical: "/tratamiento-de-datos" } };

export default async function TratamientoDeDatosPage() {
  const { legal } = await getSiteContent("published");
  return <LegalPage title="Aviso de tratamiento de datos personales" text={legal.dataTreatment} reviewed={legal.reviewedByLegalCounsel} version={legal.policyVersion} />;
}
