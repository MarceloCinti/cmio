import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { DEFAULT_LANDING } from "@/lib/site-content";
import { CLINIC_IMAGES, STOCK_IMAGES } from "@/lib/images";
import { applySeedUpgrades, PORTADA_UPGRADE_MARKER } from "../../prisma/seed-upgrades";
import { resetDatabase } from "../helpers/db";

const OLD_IMAGE = "/images/equipo/dr-hugo-rojas.jpg";
const OLD_CAPTION = "Dr. Hugo Rojas · CMIO";
const OLD_PHOTO = "/images/equipo/dr-hugo-rojas-perfil.jpg";

// Portada tal como la cargaba la semilla anterior (sin los campos del profesional destacado).
const { featuredProfessionalSlug: _slug, featuredRole: _role, ...BASE_HERO } = DEFAULT_LANDING.hero;
const OLD_HERO = { ...BASE_HERO, imagePath: OLD_IMAGE, imageAlt: "Dr. Hugo Rojas, médico del CMIO, con el uniforme de la clínica", imageCaption: OLD_CAPTION };
const landingWith = (hero: object, about: object = DEFAULT_LANDING.about) => JSON.parse(JSON.stringify({ ...DEFAULT_LANDING, about, hero }));
type Stored = { hero: Record<string, unknown>; about: Record<string, unknown> };

async function seedPrevious({ draftHero = OLD_HERO as object, publishedHero = OLD_HERO as object, photoPath = OLD_PHOTO, specialtyImage = STOCK_IMAGES.consultaMedica.path } = {}) {
  await db.siteContent.create({ data: { key: "landing", draft: landingWith(draftHero), published: landingWith(publishedHero) } });
  await db.professional.create({ data: { slug: "dr-hugo-rojas", honorific: "Dr.", firstName: "Hugo", lastName: "Rojas", photoPath } });
  await db.specialty.create({ data: { slug: "cirugia-general", name: "Cirugía general", summary: "Cirugías generales.", imagePath: specialtyImage } });
}
const landing = async () => {
  const row = await db.siteContent.findUniqueOrThrow({ where: { key: "landing" } });
  return { draft: row.draft as Stored, published: row.published as Stored };
};
const hugoPhoto = async () => (await db.professional.findUniqueOrThrow({ where: { slug: "dr-hugo-rojas" } })).photoPath;
const surgeryImage = async () => (await db.specialty.findUniqueOrThrow({ where: { slug: "cirugia-general" } })).imagePath;

describe("Actualización de datos base en instalaciones existentes", () => {
  beforeEach(resetDatabase);

  it("reemplaza la portada, el retrato y la imagen anteriores y deja una marca", async () => {
    await seedPrevious();
    expect(await applySeedUpgrades(db)).toEqual(["portada", "retrato del Dr. Hugo Rojas", "imagen de Cirugía general"]);
    const { draft, published } = await landing();
    for (const value of [draft, published]) {
      expect(value.hero).toMatchObject({
        imagePath: DEFAULT_LANDING.hero.imagePath,
        imageAlt: DEFAULT_LANDING.hero.imageAlt,
        imageCaption: "",
        featuredProfessionalSlug: "dr-hugo-rojas",
        featuredRole: DEFAULT_LANDING.hero.featuredRole,
      });
    }
    expect(await hugoPhoto()).toBe(CLINIC_IMAGES.drHugoRojasRetrato.path);
    expect(await surgeryImage()).toBe(STOCK_IMAGES.equipoMultidisciplinario.path);
    expect(await db.systemSetting.findUnique({ where: { key: PORTADA_UPGRADE_MARKER } })).not.toBeNull();
  });

  it("corre una sola vez: no deshace elecciones posteriores iguales a los valores anteriores", async () => {
    await seedPrevious();
    await applySeedUpgrades(db);
    // Después, desde el panel, alguien vuelve a elegir las imágenes anteriores.
    await db.professional.update({ where: { slug: "dr-hugo-rojas" }, data: { photoPath: OLD_PHOTO } });
    await db.specialty.update({ where: { slug: "cirugia-general" }, data: { imagePath: STOCK_IMAGES.consultaMedica.path } });
    await db.siteContent.update({ where: { key: "landing" }, data: { published: landingWith(OLD_HERO) } });
    expect(await applySeedUpgrades(db)).toEqual([]);
    expect(await hugoPhoto()).toBe(OLD_PHOTO);
    expect(await surgeryImage()).toBe(STOCK_IMAGES.consultaMedica.path);
    expect((await landing()).published.hero.imagePath).toBe(OLD_IMAGE);
  });

  it("en una base nueva solo deja la marca", async () => {
    expect(await applySeedUpgrades(db)).toEqual([]);
    expect(await db.systemSetting.findUnique({ where: { key: PORTADA_UPGRADE_MARKER } })).not.toBeNull();
  });

  it("no toca portadas, retratos ni imágenes editados desde el panel", async () => {
    const captionOnly = { ...OLD_HERO, imageCaption: "Nuestro director" };
    const imageOnly = { ...OLD_HERO, imagePath: "/uploads/foto-propia.jpg" };
    await seedPrevious({ draftHero: captionOnly, publishedHero: imageOnly, photoPath: "/uploads/retrato.jpg", specialtyImage: "/uploads/cirugia.jpg" });
    expect(await applySeedUpgrades(db)).toEqual([]);
    const { draft, published } = await landing();
    expect(draft.hero).toMatchObject({ imagePath: OLD_IMAGE, imageCaption: "Nuestro director" });
    expect(published.hero).toMatchObject({ imagePath: "/uploads/foto-propia.jpg", imageCaption: OLD_CAPTION });
    expect(await hugoPhoto()).toBe("/uploads/retrato.jpg");
    expect(await surgeryImage()).toBe("/uploads/cirugia.jpg");
  });

  it("conserva los demás textos y el profesional destacado que la clínica ya hubiera elegido", async () => {
    const customized = { ...OLD_HERO, title: "Título propio", subtitle: "Subtítulo propio", featuredProfessionalSlug: "", featuredRole: "Clínica médica" };
    await seedPrevious({ draftHero: customized, publishedHero: OLD_HERO });
    await db.siteContent.update({
      where: { key: "landing" },
      data: { draft: landingWith(customized, { ...DEFAULT_LANDING.about, intro: "Introducción propia" }) },
    });
    expect(await applySeedUpgrades(db)).toContain("portada");
    const { draft, published } = await landing();
    expect(draft.hero).toMatchObject({ imagePath: DEFAULT_LANDING.hero.imagePath, title: "Título propio", subtitle: "Subtítulo propio", featuredProfessionalSlug: "", featuredRole: "Clínica médica" });
    expect(draft.about.intro).toBe("Introducción propia");
    expect(published.hero).toMatchObject({ imagePath: DEFAULT_LANDING.hero.imagePath, featuredProfessionalSlug: "dr-hugo-rojas" });
  });

  it("actualiza solo lo publicado si el borrador ya fue editado", async () => {
    await seedPrevious({ draftHero: { ...OLD_HERO, imagePath: "/uploads/borrador.jpg", imageCaption: "" } });
    expect(await applySeedUpgrades(db)).toContain("portada");
    const { draft, published } = await landing();
    expect(draft.hero.imagePath).toBe("/uploads/borrador.jpg");
    expect(published.hero.imagePath).toBe(DEFAULT_LANDING.hero.imagePath);
  });
});
