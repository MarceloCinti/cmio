import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { parseInput } from "@/server/action";
import {
  SYSTEM_SETTING_DEFAULTS,
  SYSTEM_SETTING_SCHEMAS,
  type BookingPolicy,
  type ModulesSettings,
  type NotificationSettings,
  type SystemSettingKey,
} from "@/lib/system-settings";
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_KEYS,
  SITE_CONTENT_SCHEMAS,
  type SiteContentKey,
  type SiteContentMap,
} from "@/lib/site-content";

type SystemSettingMap = { booking: BookingPolicy; notifications: NotificationSettings; modules: ModulesSettings };

function mergeWithDefaults<T>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  return { ...defaults, ...(stored as object) } as T;
}

export async function getSystemSetting<K extends SystemSettingKey>(key: K): Promise<SystemSettingMap[K]> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  const merged = mergeWithDefaults(SYSTEM_SETTING_DEFAULTS[key], row?.value);
  const parsed = SYSTEM_SETTING_SCHEMAS[key].safeParse(merged);
  return (parsed.success ? parsed.data : SYSTEM_SETTING_DEFAULTS[key]) as SystemSettingMap[K];
}

export async function updateSystemSetting<K extends SystemSettingKey>(actor: Actor, key: K, value: unknown) {
  assertCan(actor, "configuracion.gestionar");
  const data = parseInput(SYSTEM_SETTING_SCHEMAS[key], value);
  await db.systemSetting.upsert({
    where: { key },
    create: { key, value: data as Prisma.InputJsonValue, updatedById: actor.id },
    update: { value: data as Prisma.InputJsonValue, updatedById: actor.id },
  });
  await audit(actor, { action: "configuracion.actualizar", entityType: "SystemSetting", entityId: key, details: { clave: key } });
  return data;
}

// ─────────────────────────────────────────────────────────────
// Contenido del sitio (borrador / publicado)
// ─────────────────────────────────────────────────────────────

export type ContentMode = "published" | "draft";

function parseContent<K extends SiteContentKey>(key: K, raw: unknown): SiteContentMap[K] {
  const merged = mergeWithDefaults(DEFAULT_SITE_CONTENT[key], raw);
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(merged);
  return (parsed.success ? parsed.data : DEFAULT_SITE_CONTENT[key]) as SiteContentMap[K];
}

export const getSiteContent = cache(async (mode: ContentMode = "published"): Promise<SiteContentMap> => {
  const rows = await db.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const out = {} as SiteContentMap;
  for (const key of SITE_CONTENT_KEYS) {
    const row = byKey.get(key);
    const raw = row ? (mode === "draft" ? row.draft : row.published) : undefined;
    (out as Record<string, unknown>)[key] = parseContent(key, raw);
  }
  return out;
});

export async function getContentStatus() {
  const rows = await db.siteContent.findMany();
  return SITE_CONTENT_KEYS.map((key) => {
    const row = rows.find((r) => r.key === key);
    const hasChanges = row ? JSON.stringify(row.draft) !== JSON.stringify(row.published) : false;
    return { key, hasChanges, updatedAt: row?.updatedAt ?? null, publishedAt: row?.publishedAt ?? null };
  });
}

export async function saveContentDraft<K extends SiteContentKey>(actor: Actor, key: K, value: unknown) {
  assertCan(actor, "contenido.gestionar");
  const data = parseInput(SITE_CONTENT_SCHEMAS[key], value) as Prisma.InputJsonValue;
  const existing = await db.siteContent.findUnique({ where: { key } });
  if (existing) {
    await db.siteContent.update({ where: { key }, data: { draft: data, updatedById: actor.id } });
  } else {
    // Primera edición: lo publicado sigue siendo el valor por defecto hasta publicar.
    await db.siteContent.create({
      data: {
        key,
        draft: data,
        published: DEFAULT_SITE_CONTENT[key] as unknown as Prisma.InputJsonValue,
        updatedById: actor.id,
      },
    });
  }
  await audit(actor, { action: "contenido.borrador", entityType: "SiteContent", entityId: key });
}

export async function publishContent(actor: Actor, keys: SiteContentKey[] = SITE_CONTENT_KEYS) {
  assertCan(actor, "contenido.gestionar");
  const published: string[] = [];
  await db.$transaction(async (tx) => {
    for (const key of keys) {
      const row = await tx.siteContent.findUnique({ where: { key } });
      if (!row || JSON.stringify(row.draft) === JSON.stringify(row.published)) continue;
      // Revalida antes de publicar.
      const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(row.draft);
      if (!parsed.success) continue;
      await tx.siteContent.update({
        where: { key },
        data: { published: row.draft as Prisma.InputJsonValue, publishedAt: new Date(), publishedById: actor.id },
      });
      await tx.siteContentVersion.create({
        data: { key, data: row.draft as Prisma.InputJsonValue, publishedById: actor.id },
      });
      published.push(key);
    }
    if (published.length) {
      await audit(actor, { action: "contenido.publicar", entityType: "SiteContent", details: { secciones: published } }, tx);
    }
  });
  return published;
}

export async function discardContentDraft(actor: Actor, key: SiteContentKey) {
  assertCan(actor, "contenido.gestionar");
  const row = await db.siteContent.findUnique({ where: { key } });
  if (!row) return;
  await db.siteContent.update({ where: { key }, data: { draft: row.published as Prisma.InputJsonValue, updatedById: actor.id } });
  await audit(actor, { action: "contenido.descartar_borrador", entityType: "SiteContent", entityId: key });
}
