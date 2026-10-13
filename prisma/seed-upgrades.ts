// Actualizaciones de datos base para instalaciones ya cargadas. La semilla nunca pisa filas
// existentes; estas reglas solo reemplazan valores que siguen exactamente iguales a un valor
// predeterminado anterior, así que no tocan nada que la clínica haya editado desde el panel.
// Cada actualización se aplica una sola vez: deja una marca en system_settings y no vuelve a
// correr, aunque después alguien elija desde el panel una imagen igual a la anterior.

import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { CLINIC_IMAGES, STOCK_IMAGES } from "../src/lib/images";
import { DEFAULT_LANDING } from "../src/lib/site-content";

export const PORTADA_UPGRADE_MARKER = "seed.actualizacion.portada-2026-10";

// Portada anterior: cuadro de un video del Dr. Hugo Rojas, rotulado con su nombre.
const PREVIOUS_HERO = { imagePath: "/images/equipo/dr-hugo-rojas.jpg", imageCaption: "Dr. Hugo Rojas · CMIO" };
const PREVIOUS_HUGO_PHOTO = "/images/equipo/dr-hugo-rojas-perfil.jpg";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Devuelve el contenido de portada actualizado, o null si la portada ya no es la anterior. */
export function upgradeLandingHero(value: Prisma.JsonValue): Prisma.InputJsonObject | null {
  if (!isRecord(value) || !isRecord(value.hero)) return null;
  const hero = value.hero;
  if (hero.imagePath !== PREVIOUS_HERO.imagePath || hero.imageCaption !== PREVIOUS_HERO.imageCaption) return null;
  const d = DEFAULT_LANDING.hero;
  return {
    ...value,
    hero: {
      ...hero,
      imagePath: d.imagePath,
      imageAlt: d.imageAlt,
      imageCaption: d.imageCaption,
      // Si la clínica ya eligió un profesional destacado (o lo dejó vacío), se respeta.
      featuredProfessionalSlug: "featuredProfessionalSlug" in hero ? hero.featuredProfessionalSlug : d.featuredProfessionalSlug,
      featuredRole: "featuredRole" in hero ? hero.featuredRole : d.featuredRole,
    },
  } as Prisma.InputJsonObject;
}

/** Aplica las actualizaciones pendientes y devuelve qué se cambió (para el registro de la semilla). */
export async function applySeedUpgrades(db: PrismaClient): Promise<string[]> {
  return db.$transaction(async (tx) => {
    if (await tx.systemSetting.findUnique({ where: { key: PORTADA_UPGRADE_MARKER } })) return [];
    const changes: string[] = [];

    const landing = await tx.siteContent.findUnique({ where: { key: "landing" } });
    if (landing) {
      const draft = upgradeLandingHero(landing.draft);
      const published = upgradeLandingHero(landing.published);
      if (draft || published) {
        await tx.siteContent.update({ where: { key: "landing" }, data: { ...(draft ? { draft } : {}), ...(published ? { published } : {}) } });
        changes.push("portada");
      }
    }

    const photo = await tx.professional.updateMany({
      where: { slug: "dr-hugo-rojas", photoPath: PREVIOUS_HUGO_PHOTO },
      data: { photoPath: CLINIC_IMAGES.drHugoRojasRetrato.path },
    });
    if (photo.count) changes.push("retrato del Dr. Hugo Rojas");

    // La foto de consulta pasó a la portada: Cirugía general usa otra para no repetirla.
    const specialty = await tx.specialty.updateMany({
      where: { slug: "cirugia-general", imagePath: STOCK_IMAGES.consultaMedica.path },
      data: { imagePath: STOCK_IMAGES.equipoMultidisciplinario.path, imageAlt: STOCK_IMAGES.equipoMultidisciplinario.alt },
    });
    if (specialty.count) changes.push("imagen de Cirugía general");

    await tx.systemSetting.create({ data: { key: PORTADA_UPGRADE_MARKER, value: { at: new Date().toISOString(), changes } } });
    return changes;
  });
}
