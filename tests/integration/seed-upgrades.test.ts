import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { DEFAULT_LANDING } from "@/lib/site-content";
import { CLINIC_IMAGES, STOCK_IMAGES } from "@/lib/images";
import { applySeedUpgrades } from "../../prisma/seed-upgrades";
import { resetDatabase } from "../helpers/db";

// Portada tal como la cargaba la semilla anterior.
const OLD_HERO = {
  ...DEFAULT_LANDING.hero,
  imagePath: "/images/equipo/dr-hugo-rojas.jpg",
  imageAlt: "Dr. Hugo Rojas, médico del CMIO, con el uniforme de la clínica",
  imageCaption: "Dr. Hugo Rojas · CMIO",
  featuredProfessionalSlug: undefined,
  featuredRole: undefined,
};
const oldLanding = (hero: object) => JSON.parse(JSON.stringify({ ...DEFAULT_LANDING, hero }));

async function seedPrevious({ hero = OLD_HERO, photoPath = "/images/equipo/dr-hugo-rojas-perfil.jpg", specialtyImage = STOCK_IMAGES.consultaMedica.path } = {}) {
  await db.siteContent.create({ data: { key: "landing", draft: oldLanding(hero), published: oldLanding(hero) } });
  await db.professional.create({ data: { slug: "dr-hugo-rojas", honorific: "Dr.", firstName: "Hugo", lastName: "Rojas", photoPath } });
  await db.specialty.create({ data: { slug: "cirugia-general", name: "Cirugía general", summary: "Cirugías generales.", imagePath: specialtyImage } });
}

describe("Actualización de datos base en instalaciones existentes", () => {
  beforeEach(resetDatabase);

  it("reemplaza la portada, el retrato y la imagen anteriores, una sola vez", async () => {
    await seedPrevious();
    expect(await applySeedUpgrades(db)).toEqual(["portada", "retrato del Dr. Hugo Rojas", "imagen de Cirugía general"]);

    const landing = await db.siteContent.findUniqueOrThrow({ where: { key: "landing" } });
    for (const value of [landing.draft, landing.published] as { hero: Record<string, unknown>; about: unknown }[]) {
      expect(value.hero).toMatchObject({
        imagePath: DEFAULT_LANDING.hero.imagePath,
        imageCaption: "",
        featuredProfessionalSlug: "dr-hugo-rojas",
        featuredRole: DEFAULT_LANDING.hero.featuredRole,
        title: DEFAULT_LANDING.hero.title,
      });
      expect(value.about).toEqual(JSON.parse(JSON.stringify(DEFAULT_LANDING.about)));
    }
    expect((await db.professional.findUniqueOrThrow({ where: { slug: "dr-hugo-rojas" } })).photoPath).toBe(CLINIC_IMAGES.drHugoRojasRetrato.path);
    expect((await db.specialty.findUniqueOrThrow({ where: { slug: "cirugia-general" } })).imagePath).toBe(STOCK_IMAGES.equipoMultidisciplinario.path);

    expect(await applySeedUpgrades(db)).toEqual([]);
  });

  it("no toca lo que la clínica editó desde el panel", async () => {
    const edited = { ...OLD_HERO, imagePath: "/uploads/foto-propia.jpg", imageCaption: "Nuestro consultorio" };
    await seedPrevious({ hero: edited, photoPath: "/uploads/retrato.jpg", specialtyImage: "/uploads/cirugia.jpg" });
    expect(await applySeedUpgrades(db)).toEqual([]);

    const landing = await db.siteContent.findUniqueOrThrow({ where: { key: "landing" } });
    expect((landing.published as { hero: { imagePath: string } }).hero.imagePath).toBe("/uploads/foto-propia.jpg");
    expect((await db.professional.findUniqueOrThrow({ where: { slug: "dr-hugo-rojas" } })).photoPath).toBe("/uploads/retrato.jpg");
    expect((await db.specialty.findUniqueOrThrow({ where: { slug: "cirugia-general" } })).imagePath).toBe("/uploads/cirugia.jpg");
  });

  it("actualiza solo el borrador o solo lo publicado si el otro ya fue editado", async () => {
    await seedPrevious();
    const edited = oldLanding({ ...OLD_HERO, imagePath: "/uploads/borrador.jpg", imageCaption: "" });
    await db.siteContent.update({ where: { key: "landing" }, data: { draft: edited } });
    expect(await applySeedUpgrades(db)).toContain("portada");
    const landing = await db.siteContent.findUniqueOrThrow({ where: { key: "landing" } });
    expect((landing.draft as { hero: { imagePath: string } }).hero.imagePath).toBe("/uploads/borrador.jpg");
    expect((landing.published as { hero: { imagePath: string } }).hero.imagePath).toBe(DEFAULT_LANDING.hero.imagePath);
  });
});
