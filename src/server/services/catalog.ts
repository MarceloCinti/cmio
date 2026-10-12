import "server-only";
import { db } from "@/server/db";
import { parseInput } from "@/server/action";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError, isUniqueViolation } from "@/server/errors";
import { faqSchema, professionalSchema, serviceSchema, slugify, specialtySchema } from "@/lib/validation/catalog";
import { storeFile, validateUpload } from "@/server/integrations/storage";
import type { Prisma } from "@/generated/prisma/client";

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let i = 2; await exists(slug); i++) slug = `${root}-${i}`;
  return slug;
}

const nullify = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v])) as {
    [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K];
  };

// ─────────────────────────────────────────────────────────────
// Especialidades
// ─────────────────────────────────────────────────────────────

export async function listSpecialtiesAdmin(actor: Actor) {
  assertCan(actor, "catalogo.gestionar");
  return db.specialty.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true, professionals: true } } },
  });
}

export async function saveSpecialty(actor: Actor, id: string | null, input: unknown) {
  assertCan(actor, "catalogo.gestionar");
  const data = nullify(parseInput(specialtySchema, input));
  if (id) {
    await db.specialty.update({ where: { id }, data });
    await audit(actor, { action: "catalogo.especialidad_editar", entityType: "Specialty", entityId: id });
    return id;
  }
  const slug = await uniqueSlug(data.name, async (s) => Boolean(await db.specialty.findUnique({ where: { slug: s } })));
  const created = await db.specialty.create({ data: { ...data, slug } });
  await audit(actor, { action: "catalogo.especialidad_crear", entityType: "Specialty", entityId: created.id });
  return created.id;
}

export async function deleteSpecialty(actor: Actor, id: string) {
  assertCan(actor, "catalogo.gestionar");
  const used = await db.appointment.count({ where: { service: { specialtyId: id } } });
  if (used) throw new ConflictError("La especialidad tiene citas asociadas. Ocúltala en lugar de eliminarla.");
  await db.specialty.delete({ where: { id } });
  await audit(actor, { action: "catalogo.especialidad_eliminar", entityType: "Specialty", entityId: id });
}

// ─────────────────────────────────────────────────────────────
// Servicios
// ─────────────────────────────────────────────────────────────

export async function listServicesAdmin(actor: Actor) {
  assertCan(actor, "catalogo.gestionar");
  return db.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { specialty: { select: { name: true } }, _count: { select: { professionals: true, appointments: true } } },
  });
}

export async function saveService(actor: Actor, id: string | null, input: unknown) {
  assertCan(actor, "catalogo.gestionar");
  const parsed = parseInput(serviceSchema, input);
  if (parsed.isPublished && !parsed.availabilityConfirmed) {
    throw new ValidationError("Para publicar un servicio primero confirma que la clínica lo ofrece.", {
      availabilityConfirmed: ["Confirma la disponibilidad antes de publicar."],
    });
  }
  if (parsed.bookableOnline && (!parsed.availabilityConfirmed || !parsed.isPublished)) {
    throw new ValidationError("Solo los servicios confirmados y publicados pueden agendarse en línea.", {
      bookableOnline: ["Confirma y publica el servicio para habilitar la reserva en línea."],
    });
  }
  const data = nullify(parsed);
  if (data.specialtyId) {
    const s = await db.specialty.findUnique({ where: { id: data.specialtyId } });
    if (!s) data.specialtyId = null;
  }
  if (id) {
    await db.service.update({ where: { id }, data: data as Prisma.ServiceUncheckedUpdateInput });
    await audit(actor, { action: "catalogo.servicio_editar", entityType: "Service", entityId: id, details: { confirmado: parsed.availabilityConfirmed, publicado: parsed.isPublished } });
    return id;
  }
  const slug = await uniqueSlug(parsed.name, async (s) => Boolean(await db.service.findUnique({ where: { slug: s } })));
  const created = await db.service.create({ data: { ...(data as Prisma.ServiceUncheckedCreateInput), slug } });
  await audit(actor, { action: "catalogo.servicio_crear", entityType: "Service", entityId: created.id });
  return created.id;
}

export async function deleteService(actor: Actor, id: string) {
  assertCan(actor, "catalogo.gestionar");
  const used = await db.appointment.count({ where: { serviceId: id } });
  if (used) throw new ConflictError("El servicio tiene citas registradas. Despublícalo en lugar de eliminarlo.");
  await db.service.delete({ where: { id } });
  await audit(actor, { action: "catalogo.servicio_eliminar", entityType: "Service", entityId: id });
}

// ─────────────────────────────────────────────────────────────
// Profesionales
// ─────────────────────────────────────────────────────────────

export async function listProfessionalsAdmin(actor: Actor) {
  assertCan(actor, "catalogo.gestionar");
  return db.professional.findMany({
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
    include: {
      user: { select: { email: true, status: true } },
      specialties: { include: { specialty: { select: { name: true } } } },
      _count: { select: { scheduleRules: true, services: true } },
    },
  });
}

export async function getProfessionalAdmin(actor: Actor, id: string) {
  assertCan(actor, "catalogo.gestionar");
  const p = await db.professional.findUnique({
    where: { id },
    include: { specialties: true, services: true, user: { select: { id: true, email: true, name: true } } },
  });
  if (!p) throw new NotFoundError("No encontramos al profesional.");
  return p;
}

export async function saveProfessional(actor: Actor, id: string | null, input: unknown) {
  assertCan(actor, "catalogo.gestionar");
  const d = parseInput(professionalSchema, input);
  const specialtyIds = d.specialtyIds ?? [];
  const serviceIds = d.serviceIds ?? [];
  // Reglas de publicación: perfiles completos y credenciales verificadas cuando se muestran.
  if (d.isPublished) {
    const problems: string[] = [];
    if (d.status !== "ACTIVE") problems.push("el perfil debe estar activo");
    if (!specialtyIds.length) problems.push("debe tener al menos una especialidad");
    if (!d.bio || d.bio.length < 30) problems.push("debe tener una descripción profesional de al menos 30 caracteres");
    if (problems.length) throw new ValidationError(`Para publicar el perfil: ${problems.join(", ")}.`, { isPublished: ["Completa el perfil antes de publicarlo."] });
  }
  const existing = id ? await db.professional.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new NotFoundError("No encontramos al profesional.");
  // Vincular una cuenta da acceso a la historia clínica: solo el propietario puede hacerlo,
  // solo con cuentas de rol profesional y nunca con su propia cuenta. Si el formulario no
  // envía el campo (personas sin esa facultad), se conserva la vinculación actual.
  const linkFieldSent = typeof input === "object" && input !== null && "userId" in input;
  const currentUserId = existing?.userId ?? null;
  const userId: string | null = linkFieldSent ? (d.userId ?? null) : currentUserId;
  const linkChanged = userId !== currentUserId;
  if (linkChanged) {
    if (actor.role !== "OWNER") throw new ForbiddenError("Solo el propietario puede vincular o desvincular la cuenta de un profesional.");
    if (userId) {
      if (userId === actor.id) throw new ForbiddenError("No puedes vincular tu propia cuenta a un perfil profesional.");
      const u = await db.user.findUnique({ where: { id: userId }, include: { professional: true } });
      if (!u || u.role !== "DOCTOR" || u.status === "DISABLED") {
        throw new ValidationError("Solo se pueden vincular cuentas activas con rol de profesional de la salud.");
      }
      if (u.professional && u.professional.id !== id) throw new ConflictError("Esa cuenta ya está vinculada a otro perfil profesional.");
    }
  }
  const verifiedNow = d.credentialsVerified && !existing?.credentialsVerifiedAt;
  const base = {
    honorific: d.honorific ?? null,
    firstName: d.firstName,
    lastName: d.lastName,
    licenseNumber: d.licenseNumber ?? null,
    credentials: d.credentials ?? null,
    credentialsVerifiedAt: d.credentialsVerified ? (existing?.credentialsVerifiedAt ?? new Date()) : null,
    credentialsVerifiedBy: d.credentialsVerified ? (existing?.credentialsVerifiedBy ?? actor.id) : null,
    bio: d.bio ?? null,
    photoPath: d.photoPath ?? null,
    status: d.status,
    isPublished: d.isPublished,
    acceptsOnlineBooking: d.acceptsOnlineBooking,
    agendaColor: d.agendaColor ?? null,
    sortOrder: d.sortOrder,
    userId,
  };
  try {
    const saved = await db.$transaction(async (tx) => {
      const p = id
        ? await tx.professional.update({ where: { id }, data: base })
        : await tx.professional.create({
            data: { ...base, slug: await uniqueSlug(`${d.firstName} ${d.lastName}`, async (s) => Boolean(await tx.professional.findUnique({ where: { slug: s } }))) },
          });
      await tx.professionalSpecialty.deleteMany({ where: { professionalId: p.id } });
      if (specialtyIds.length) await tx.professionalSpecialty.createMany({ data: specialtyIds.map((specialtyId) => ({ professionalId: p.id, specialtyId })), skipDuplicates: true });
      await tx.professionalService.deleteMany({ where: { professionalId: p.id } });
      if (serviceIds.length) await tx.professionalService.createMany({ data: serviceIds.map((serviceId) => ({ professionalId: p.id, serviceId })), skipDuplicates: true });
      await audit(
        actor,
        {
          action: id ? "catalogo.profesional_editar" : "catalogo.profesional_crear",
          entityType: "Professional",
          entityId: p.id,
          details: {
            estado: d.status,
            publicado: d.isPublished,
            credencialesVerificadas: d.credentialsVerified,
            verificadoAhora: verifiedNow,
            ...(linkChanged ? { cuentaAnterior: currentUserId, cuentaNueva: userId } : {}),
          },
        },
        tx,
      );
      return p;
    });
    return saved.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictError("Esa cuenta ya está vinculada a otro perfil profesional.");
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// Preguntas frecuentes
// ─────────────────────────────────────────────────────────────

export async function listFaqsAdmin(actor: Actor) {
  assertCan(actor, "contenido.gestionar");
  return db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function saveFaq(actor: Actor, id: string | null, input: unknown) {
  assertCan(actor, "contenido.gestionar");
  const data = parseInput(faqSchema, input);
  const saved = id ? await db.faq.update({ where: { id }, data }) : await db.faq.create({ data });
  await audit(actor, { action: id ? "contenido.faq_editar" : "contenido.faq_crear", entityType: "Faq", entityId: saved.id });
}

export async function deleteFaq(actor: Actor, id: string) {
  assertCan(actor, "contenido.gestionar");
  await db.faq.delete({ where: { id } });
  await audit(actor, { action: "contenido.faq_eliminar", entityType: "Faq", entityId: id });
}

// ─────────────────────────────────────────────────────────────
// Imágenes públicas (logotipo, fotos de perfiles, imágenes del sitio)
// ─────────────────────────────────────────────────────────────

export async function uploadPublicImage(actor: Actor, file: File | null) {
  if (!["contenido.gestionar", "catalogo.gestionar"].some((p) => actor.role === "OWNER" || actor.permissions.has(p as "contenido.gestionar"))) {
    assertCan(actor, "contenido.gestionar");
  }
  const { buffer, mime } = await validateUpload(file, { maxBytes: 5 * 1024 * 1024, allowed: ["image/jpeg", "image/png", "image/webp"] });
  const stored = await storeFile("media", buffer, mime);
  await db.mediaAsset.create({
    data: { storageKey: stored.key, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, originalName: (file?.name ?? "imagen").slice(0, 150), uploadedById: actor.id },
  });
  await audit(actor, { action: "contenido.imagen_subida", entityType: "MediaAsset", details: { clave: stored.key } });
  return `/${stored.key.replace(/^media\//, "media/")}`;
}
