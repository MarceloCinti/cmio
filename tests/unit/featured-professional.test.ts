import { describe, expect, it } from "vitest";
import { findFeaturedProfessional } from "@/lib/featured-professional";
import { DEFAULT_LANDING, DEFAULT_SITE_CONTENT, SITE_CONTENT_SCHEMAS, profileSlug } from "@/lib/site-content";

const HUGO = { slug: "dr-hugo-rojas", honorific: "Dr.", firstName: "Hugo", lastName: "Rojas", photoPath: "/images/equipo/dr-hugo-rojas-retrato.jpg" };
const hero = (featuredProfessionalSlug: string) => ({ ...DEFAULT_LANDING.hero, featuredProfessionalSlug });

describe("Profesional destacado de la portada", () => {
  it.each([
    ["dr-hugo-rojas", "dr-hugo-rojas"],
    ["  Dr-Hugo-Rojas ", "dr-hugo-rojas"],
    ["/profesionales/dr-hugo-rojas", "dr-hugo-rojas"],
    ["https://cmio.vercel.app/profesionales/dr-hugo-rojas/?utm=x#perfil", "dr-hugo-rojas"],
    ["", ""],
    [" / ", ""],
  ])("normaliza «%s» como «%s»", (input, expected) => {
    expect(profileSlug(input)).toBe(expected);
  });

  it("toma nombre, foto e iniciales del perfil publicado y el texto de la portada", () => {
    expect(findFeaturedProfessional(hero("/profesionales/dr-hugo-rojas"), [HUGO])).toEqual({
      slug: "dr-hugo-rojas",
      name: "Dr. Hugo Rojas",
      initials: "HR",
      photoPath: HUGO.photoPath,
      role: DEFAULT_LANDING.hero.featuredRole,
    });
  });

  it("no muestra la tarjeta si el perfil no está entre los publicados o no se configuró", () => {
    expect(findFeaturedProfessional(hero("dr-otro"), [HUGO])).toBeNull();
    expect(findFeaturedProfessional(hero(""), [HUGO])).toBeNull();
  });

  it("usa las iniciales de nombre y apellido sin importar el tratamiento", () => {
    const p = { slug: "lic-ana", honorific: "Lic", firstName: "María José", lastName: "López", photoPath: null };
    expect(findFeaturedProfessional(hero("lic-ana"), [p])?.initials).toBe("ML");
  });

  it("el editor guarda solo el identificador aunque se pegue una dirección larga", () => {
    const url = "https://cmio-4fjwoko2b-contingenciamc1-3536s-projects.vercel.app/profesionales/dr-francisco-rios?utm_source=ig&utm_medium=social";
    const landing = { ...DEFAULT_SITE_CONTENT.landing, hero: { ...DEFAULT_SITE_CONTENT.landing.hero, featuredProfessionalSlug: url } };
    const parsed = SITE_CONTENT_SCHEMAS.landing.parse(landing);
    expect(parsed.hero.featuredProfessionalSlug).toBe("dr-francisco-rios");
  });

  it("acepta textos de hasta 60 caracteres guardados con versiones anteriores", () => {
    const role = "Médico cirujano y director médico del centro";
    const landing = { ...DEFAULT_SITE_CONTENT.landing, hero: { ...DEFAULT_SITE_CONTENT.landing.hero, featuredRole: role } };
    expect(SITE_CONTENT_SCHEMAS.landing.safeParse(landing).success).toBe(true);
  });
});
