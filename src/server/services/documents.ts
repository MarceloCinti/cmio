import "server-only";
import { db } from "@/server/db";
import { parseInput } from "@/server/action";
import { can, isClinician, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import { documentUploadSchema } from "@/lib/validation/clinical";
import { z } from "@/lib/validation/zod-es";
import { formDataToObject } from "@/lib/form-data";
import { readStoredFile, storeFile, validateUpload } from "@/server/integrations/storage";
import { hasClinicalAccess } from "./clinical";
import { kickMessageQueue, queueMessage } from "./messaging";
import { notifyUser } from "./notifications";
import { latestConsents } from "./appointment-notifications";

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadDocument(actor: Actor, patientId: string, formData: FormData) {
  const clinician = isClinician(actor) && (await hasClinicalAccess(actor, patientId));
  if (!clinician && !can(actor, "documentos.subir")) throw new ForbiddenError("No tienes permiso para subir documentos.");
  const patient = await db.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError("No encontramos al paciente.");
  const meta = parseInput(documentUploadSchema, formDataToObject(formData));
  const { buffer, mime } = await validateUpload(formData.get("file") as File | null, {
    maxBytes: MAX_BYTES,
    allowed: ["application/pdf", "image/jpeg", "image/png"],
  });
  if (meta.encounterId) {
    const enc = await db.encounter.findFirst({ where: { id: meta.encounterId, patientId }, select: { id: true } });
    if (!enc) meta.encounterId = undefined;
  }
  const stored = await storeFile("clinical", buffer, mime);
  const originalName = ((formData.get("file") as File).name || "documento").slice(0, 150);
  // Solo un profesional con relación de atención puede publicar directamente.
  const publish = meta.publishNow && clinician;
  const doc = await db.clinicalDocument.create({
    data: {
      patientId,
      encounterId: meta.encounterId ?? null,
      category: meta.category,
      title: meta.title,
      description: meta.description ?? null,
      storageKey: stored.key,
      originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      uploadedById: actor.id,
      uploadedByName: actor.name,
      status: publish ? "PUBLISHED" : "PENDING_REVIEW",
      reviewedById: publish ? actor.id : null,
      reviewedByName: publish ? actor.name : null,
      publishedAt: publish ? new Date() : null,
    },
  });
  await audit(actor, { action: "documentos.subir", entityType: "ClinicalDocument", entityId: doc.id, patientId, details: { categoria: meta.category, publicado: publish } });
  if (publish) await notifyDocumentPublished(doc.id);
  return doc;
}

/**
 * Listado: los profesionales con relación de atención ven todos los documentos. Quien solo
 * tiene permiso para subir documentos (p. ej., secretaría) ve únicamente los que subió, porque
 * el título o la categoría de otros documentos ya puede revelar información clínica.
 */
export async function listPatientDocuments(actor: Actor, patientId: string) {
  const clinician = isClinician(actor) && (await hasClinicalAccess(actor, patientId));
  if (!clinician && !can(actor, "documentos.subir")) throw new ForbiddenError();
  const docs = await db.clinicalDocument.findMany({
    where: { patientId, ...(clinician ? {} : { uploadedById: actor.id }) },
    orderBy: { createdAt: "desc" },
  });
  return { docs, canReview: clinician, canDownload: clinician };
}

export async function publishDocument(actor: Actor, documentId: string) {
  const doc = await db.clinicalDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError("No encontramos el documento.");
  if (!isClinician(actor) || !(await hasClinicalAccess(actor, doc.patientId))) {
    throw new ForbiddenError("Solo un profesional responsable del paciente puede autorizar la publicación.");
  }
  if (doc.status === "PUBLISHED") return;
  await db.clinicalDocument.update({
    where: { id: documentId },
    data: { status: "PUBLISHED", reviewedById: actor.id, reviewedByName: actor.name, publishedAt: new Date(), withdrawnAt: null, withdrawnReason: null },
  });
  await audit(actor, { action: "documentos.publicar", entityType: "ClinicalDocument", entityId: documentId, patientId: doc.patientId });
  await notifyDocumentPublished(documentId);
}

const withdrawSchema = z.object({ reason: z.string().trim().min(3, "Indica el motivo.").max(300) });

export async function withdrawDocument(actor: Actor, documentId: string, input: unknown) {
  const { reason } = parseInput(withdrawSchema, input);
  const doc = await db.clinicalDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError("No encontramos el documento.");
  if (!isClinician(actor) || !(await hasClinicalAccess(actor, doc.patientId))) throw new ForbiddenError();
  if (doc.status === "WITHDRAWN") throw new ConflictError("El documento ya fue retirado.");
  await db.clinicalDocument.update({ where: { id: documentId }, data: { status: "WITHDRAWN", withdrawnAt: new Date(), withdrawnReason: reason } });
  await audit(actor, { action: "documentos.retirar", entityType: "ClinicalDocument", entityId: documentId, patientId: doc.patientId, details: { motivo: reason } });
}

async function notifyDocumentPublished(documentId: string) {
  const doc = await db.clinicalDocument.findUnique({
    where: { id: documentId },
    include: { patient: { include: { user: { select: { id: true, email: true } } } } },
  });
  if (!doc) return;
  const p = doc.patient;
  // El aviso no incluye el título ni el contenido del documento.
  if (p.userId) await notifyUser(p.userId, { title: "Nuevo documento disponible", body: "Tienes un nuevo documento en tu portal.", href: "/portal/documentos" });
  const consents = await latestConsents(p.id);
  await queueMessage({
    channel: "EMAIL",
    event: "DOCUMENT_PUBLISHED",
    recipient: p.user?.email ?? p.email,
    vars: { nombre: p.firstName, enlace: `${process.env.APP_URL ?? ""}/portal/documentos` },
    userId: p.userId,
    patientId: p.id,
    skipReason: !p.userId ? "SIN_DESTINATARIO" : consents.EMAIL_NOTIFICATIONS === false ? "SIN_CONSENTIMIENTO" : undefined,
  });
  kickMessageQueue();
}

export async function listMyDocuments(actor: Actor) {
  if (actor.role !== "PATIENT" || !actor.patientId) throw new ForbiddenError();
  return db.clinicalDocument.findMany({
    where: { patientId: actor.patientId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, category: true, description: true, publishedAt: true, reviewedByName: true, mimeType: true, sizeBytes: true },
  });
}

/** Entrega un documento solo a quien está autorizado; cada descarga queda registrada. */
export async function getDocumentForDownload(actor: Actor, documentId: string) {
  const doc = await db.clinicalDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new NotFoundError();
  const isOwner = actor.role === "PATIENT" && actor.patientId === doc.patientId && doc.status === "PUBLISHED";
  const clinician = !isOwner && isClinician(actor) && (await hasClinicalAccess(actor, doc.patientId));
  if (!isOwner && !clinician) {
    await audit(actor, { action: "documentos.descarga_denegada", entityType: "ClinicalDocument", entityId: documentId, patientId: doc.patientId, success: false });
    throw new NotFoundError();
  }
  const content = await readStoredFile(doc.storageKey);
  await audit(actor, { action: "documentos.descargar", entityType: "ClinicalDocument", entityId: documentId, patientId: doc.patientId });
  return { doc, content };
}
