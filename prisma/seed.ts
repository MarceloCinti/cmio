// Datos base de la plataforma. Es idempotente: no sobrescribe cambios hechos desde el panel.
// Uso: pnpm db:seed
// Variables opcionales para crear la cuenta del propietario:
//   OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD (mínimo 12 caracteres)

import { hash } from "@node-rs/argon2";
import type { Prisma } from "../src/generated/prisma/client";
import { createScriptClient } from "./script-client";
import { FAQS, PROFESSIONALS, SERVICES, SPECIALTIES } from "./seed-data";
import { applySeedUpgrades } from "./seed-upgrades";
import { CONFIGURABLE_ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/lib/permissions";
import { DEFAULT_SITE_CONTENT, SITE_CONTENT_KEYS } from "../src/lib/site-content";
import { SYSTEM_SETTING_DEFAULTS } from "../src/lib/system-settings";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_WHATSAPP_TEMPLATES,
  type MessageEventKey,
} from "../src/lib/message-templates";

const db = createScriptClient();

async function seedPermissions() {
  const marker = await db.systemSetting.findUnique({ where: { key: "permissions.initialized" } });
  if (marker) return;
  for (const role of CONFIGURABLE_ROLES) {
    for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
      await db.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        create: { role, permission },
        update: {},
      });
    }
  }
  await db.systemSetting.create({ data: { key: "permissions.initialized", value: { at: new Date().toISOString() } } });
  console.log("✓ Permisos por rol inicializados");
}

async function seedContent() {
  for (const key of SITE_CONTENT_KEYS) {
    const value = DEFAULT_SITE_CONTENT[key] as unknown as Prisma.InputJsonValue;
    await db.siteContent.upsert({
      where: { key },
      create: { key, draft: value, published: value, publishedAt: new Date() },
      update: {},
    });
  }
  for (const [key, value] of Object.entries(SYSTEM_SETTING_DEFAULTS)) {
    await db.systemSetting.upsert({
      where: { key },
      create: { key, value: value as unknown as Prisma.InputJsonValue },
      update: {},
    });
  }
  console.log("✓ Contenido institucional y parámetros");
}

async function seedCatalog() {
  for (const s of SPECIALTIES) {
    await db.specialty.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        name: s.name,
        summary: s.summary,
        description: s.description,
        imagePath: s.image.path,
        imageAlt: s.image.alt,
        sortOrder: s.sortOrder,
        isPublished: true,
      },
      update: {},
    });
  }
  const specialties = await db.specialty.findMany({ select: { id: true, slug: true } });
  for (const s of SERVICES) {
    await db.service.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        name: s.name,
        summary: s.summary,
        description: s.description,
        category: s.category,
        specialtyId: specialties.find((x) => x.slug === s.specialtySlug)?.id ?? null,
        durationMinutes: s.durationMinutes,
        availabilityConfirmed: s.confirmed,
        isPublished: s.confirmed,
        bookableOnline: s.bookable ?? s.confirmed,
        imagePath: s.image?.path ?? null,
        imageAlt: s.image?.alt ?? null,
        sortOrder: s.sortOrder,
      },
      update: {},
    });
  }
  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i + 1 })) });
  }
  console.log("✓ Especialidades, servicios y preguntas frecuentes");
}

async function seedProfessionals() {
  const specialties = await db.specialty.findMany({ select: { id: true, slug: true } });
  for (const p of PROFESSIONALS) {
    if (await db.professional.findUnique({ where: { slug: p.slug } })) continue;
    await db.professional.create({
      data: {
        slug: p.slug,
        honorific: p.honorific,
        firstName: p.firstName,
        lastName: p.lastName,
        bio: p.bio,
        photoPath: p.photo.path,
        status: "ACTIVE",
        isPublished: true,
        acceptsOnlineBooking: false,
        sortOrder: p.sortOrder,
        specialties: {
          create: p.specialtySlugs
            .map((slug) => specialties.find((s) => s.slug === slug)?.id)
            .filter((id): id is string => Boolean(id))
            .map((specialtyId) => ({ specialtyId })),
        },
      },
    });
  }
  console.log("✓ Profesionales del CMIO");
}

async function seedTemplates() {
  for (const [event, t] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
    await db.messageTemplate.upsert({
      where: { event_channel: { event: event as MessageEventKey, channel: "EMAIL" } },
      create: { event: event as MessageEventKey, channel: "EMAIL", subject: t.subject, body: t.body },
      update: {},
    });
  }
  for (const [event, t] of Object.entries(DEFAULT_WHATSAPP_TEMPLATES)) {
    if (!t) continue;
    await db.messageTemplate.upsert({
      where: { event_channel: { event: event as MessageEventKey, channel: "WHATSAPP" } },
      create: {
        event: event as MessageEventKey,
        channel: "WHATSAPP",
        body: t.body,
        whatsappTemplateName: t.whatsappTemplateName,
        whatsappLanguage: "es",
      },
      update: {},
    });
  }
  console.log("✓ Plantillas de mensajes");
}

async function seedOwner() {
  const existing = await db.user.count({ where: { role: "OWNER" } });
  if (existing > 0) return;
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME?.trim() || "Propietario";
  if (!email || !password) {
    console.log(
      "ℹ No se creó la cuenta del propietario. Define OWNER_EMAIL, OWNER_NAME y OWNER_PASSWORD y vuelve a ejecutar pnpm db:seed.",
    );
    return;
  }
  if (password.length < 12) throw new Error("OWNER_PASSWORD debe tener al menos 12 caracteres.");
  await db.user.create({
    data: {
      email,
      name,
      role: "OWNER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 }),
      passwordChangedAt: new Date(),
    },
  });
  await db.auditLog.create({ data: { action: "usuarios.crear_propietario_inicial", entityType: "User", details: { email } } });
  console.log(`✓ Cuenta de propietario creada para ${email}`);
}

async function main() {
  await seedPermissions();
  await seedContent();
  await seedCatalog();
  await seedProfessionals();
  const upgraded = await applySeedUpgrades(db);
  if (upgraded.length) console.log(`✓ Datos base actualizados: ${upgraded.join(", ")}`);
  await seedTemplates();
  await seedOwner();
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
