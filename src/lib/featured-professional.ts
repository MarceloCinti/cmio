import { profileSlug, type Landing } from "@/lib/site-content";

/** Profesional destacado en la portada (datos tomados de su perfil publicado). */
export type FeaturedProfessional = { slug: string; name: string; initials: string; photoPath: string | null; role: string };

/** Busca el profesional destacado de la portada entre los perfiles publicados. */
export function findFeaturedProfessional(
  hero: Landing["hero"],
  professionals: { slug: string; honorific: string | null; firstName: string; lastName: string; photoPath: string | null }[],
): FeaturedProfessional | null {
  // Normaliza también al leer, por contenido guardado antes de que el editor lo hiciera.
  const slug = profileSlug(hero.featuredProfessionalSlug);
  const p = slug ? professionals.find((x) => x.slug === slug) : undefined;
  if (!p) return null;
  return {
    slug: p.slug,
    name: [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" "),
    initials: `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase(),
    photoPath: p.photoPath,
    role: hero.featuredRole,
  };
}
