import type { Institution } from "@/lib/site-content";
import { normalizePhone } from "@/lib/site-content";

/**
 * Datos estructurados schema.org. Los datos de contacto y horarios solo se incluyen
 * cuando la clínica marcó la información de contacto como verificada.
 */
export function MedicalClinicJsonLd({ institution, specialties }: { institution: Institution; specialties: string[] }) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${institution.name} (${institution.shortName})`,
    url: base,
    address: {
      "@type": "PostalAddress",
      addressLocality: institution.city,
      addressCountry: "PY",
      ...(institution.contactVerified ? { streetAddress: `${institution.address}, ${institution.addressReference}` } : {}),
    },
    medicalSpecialty: specialties,
  };
  if (institution.contactVerified) {
    const phone = institution.phones[0] ? normalizePhone(institution.phones[0].number) : null;
    if (phone) data.telephone = `+${phone}`;
    if (institution.latitude != null && institution.longitude != null) {
      data.geo = { "@type": "GeoCoordinates", latitude: institution.latitude, longitude: institution.longitude };
    }
  }
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
