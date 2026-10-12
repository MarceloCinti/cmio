import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublishedProfessionals, listPublishedSpecialties } from "@/server/services/public-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Se genera en cada solicitud para reflejar especialidades y perfiles publicados desde el panel.
  await connection();
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [specialties, professionals] = await Promise.all([listPublishedSpecialties(), listPublishedProfessionals()]);
  const staticPaths = [
    "",
    "/la-clinica",
    "/especialidades",
    "/servicios",
    "/profesionales",
    "/preguntas-frecuentes",
    "/contacto",
    "/solicitar-cita",
    "/privacidad",
    "/terminos",
    "/tratamiento-de-datos",
  ];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...specialties.map((s) => ({ url: `${base}/especialidades/${s.slug}`, lastModified: s.updatedAt, priority: 0.8 })),
    ...professionals.map((p) => ({ url: `${base}/profesionales/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
