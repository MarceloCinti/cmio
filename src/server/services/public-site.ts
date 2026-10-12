import "server-only";
import { cache } from "react";
import { db } from "@/server/db";

// Consultas de solo lectura para el sitio público. Solo devuelven información publicada.

export const listPublishedSpecialties = cache(async () => {
  return db.specialty.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      professionals: {
        where: { professional: { isPublished: true, status: "ACTIVE" } },
        select: { professional: { select: { id: true, slug: true, honorific: true, firstName: true, lastName: true } } },
      },
      services: {
        where: { isPublished: true, availabilityConfirmed: true },
        select: { id: true, slug: true, name: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
});

export async function getPublishedSpecialty(slug: string) {
  return db.specialty.findFirst({
    where: { slug, isPublished: true },
    include: {
      professionals: {
        where: { professional: { isPublished: true, status: "ACTIVE" } },
        select: {
          professional: {
            select: { id: true, slug: true, honorific: true, firstName: true, lastName: true, photoPath: true, bio: true },
          },
        },
      },
      services: {
        where: { isPublished: true, availabilityConfirmed: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export const listPublicServices = cache(async () => {
  return db.service.findMany({
    where: { isPublished: true, availabilityConfirmed: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { specialty: { select: { name: true, slug: true } } },
  });
});

export const listPublishedProfessionals = cache(async () => {
  return db.professional.findMany({
    where: { isPublished: true, status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }],
    include: {
      specialties: { include: { specialty: { select: { name: true, slug: true, isPublished: true } } } },
    },
  });
});

export async function getPublishedProfessional(slug: string) {
  return db.professional.findFirst({
    where: { slug, isPublished: true, status: "ACTIVE" },
    include: {
      specialties: { include: { specialty: { select: { name: true, slug: true, isPublished: true } } } },
      services: {
        where: { service: { isPublished: true, availabilityConfirmed: true } },
        include: { service: { select: { id: true, name: true, slug: true, durationMinutes: true } } },
      },
      scheduleRules: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
    },
  });
}

export const listPublishedFaqs = cache(async () => {
  return db.faq.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
});

export function professionalDisplayName(p: { honorific?: string | null; firstName: string; lastName: string }) {
  return [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" ");
}
