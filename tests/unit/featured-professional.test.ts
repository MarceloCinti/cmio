import { describe, expect, it } from "vitest";
import { findFeaturedProfessional, profileSlug } from "@/lib/featured-professional";
import { DEFAULT_LANDING } from "@/lib/site-content";

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
});
