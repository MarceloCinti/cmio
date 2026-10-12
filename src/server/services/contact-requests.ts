import "server-only";
import { db } from "@/server/db";
import { parseInput } from "@/server/action";
import { enforceRateLimit } from "@/server/auth/rate-limit";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit, auditAnonymous } from "@/server/audit";
import { NotFoundError } from "@/server/errors";
import { appointmentRequestSchema, contactFormSchema } from "@/lib/validation/public-forms";
import type { ContactStatus } from "@/generated/prisma/client";
import { notifyStaff } from "./notifications";

const RATE_MESSAGE = "Recibimos varias solicitudes desde tu conexión. Espera unos minutos o comunícate por teléfono.";

export async function submitContactForm(input: unknown, meta: { ip: string; userAgent: string | null }) {
  const data = parseInput(contactFormSchema, input);
  await enforceRateLimit(`contacto:${meta.ip}`, 5, 60 * 30, RATE_MESSAGE);
  if (data.website) return; // bot: se descarta silenciosamente
  const request = await db.contactRequest.create({
    data: {
      kind: "GENERAL",
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      message: data.message,
      consentAccepted: true,
    },
  });
  await auditAnonymous({ action: "sitio.contacto_recibido", entityType: "ContactRequest", entityId: request.id, ip: meta.ip });
  await notifyStaff("solicitudes.gestionar", {
    title: "Nuevo mensaje desde el sitio web",
    body: `${data.fullName} envió una consulta.`,
    href: "/panel/solicitudes",
  });
}

export async function submitAppointmentRequest(input: unknown, meta: { ip: string; userAgent: string | null }) {
  const data = parseInput(appointmentRequestSchema, input);
  await enforceRateLimit(`solicitud-cita:${meta.ip}`, 5, 60 * 30, RATE_MESSAGE);
  if (data.website) return;
  let specialtyId: string | null = null;
  if (data.specialtyId) {
    const s = await db.specialty.findFirst({ where: { id: data.specialtyId, isPublished: true }, select: { id: true } });
    specialtyId = s?.id ?? null;
  }
  const request = await db.contactRequest.create({
    data: {
      kind: "APPOINTMENT",
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      specialtyId,
      preferredSchedule: data.preferredSchedule ?? null,
      message: data.message ?? null,
      consentAccepted: true,
    },
  });
  await auditAnonymous({ action: "sitio.solicitud_cita_recibida", entityType: "ContactRequest", entityId: request.id, ip: meta.ip });
  await notifyStaff("solicitudes.gestionar", {
    title: "Nueva solicitud de cita",
    body: `${data.fullName} solicitó una cita desde el sitio web.`,
    href: "/panel/solicitudes",
  });
}

export async function listContactRequests(actor: Actor, opts: { status?: ContactStatus | "OPEN"; page?: number }) {
  assertCan(actor, "solicitudes.gestionar");
  const page = Math.max(1, opts.page ?? 1);
  const where =
    opts.status === "OPEN" || !opts.status
      ? { status: { in: ["NEW", "IN_PROGRESS"] as ContactStatus[] } }
      : { status: opts.status };
  const [items, total] = await Promise.all([
    db.contactRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 25,
      skip: (page - 1) * 25,
      include: { specialty: { select: { name: true } } },
    }),
    db.contactRequest.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
}

export async function updateContactRequest(
  actor: Actor,
  id: string,
  data: { status: ContactStatus; internalNote?: string | null },
) {
  assertCan(actor, "solicitudes.gestionar");
  const existing = await db.contactRequest.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("La solicitud no existe.");
  await db.contactRequest.update({
    where: { id },
    data: {
      status: data.status,
      internalNote: data.internalNote ?? existing.internalNote,
      handledById: actor.id,
      handledAt: new Date(),
    },
  });
  await audit(actor, {
    action: "solicitudes.actualizar",
    entityType: "ContactRequest",
    entityId: id,
    details: { estado: data.status },
  });
}

export async function countOpenContactRequests() {
  return db.contactRequest.count({ where: { status: "NEW" } });
}
