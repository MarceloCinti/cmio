import "server-only";
import { db } from "@/server/db";
import { parseInput } from "@/server/action";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { z } from "@/lib/validation/zod-es";
import { SECURITY_EVENTS, type MessageEventKey } from "@/lib/message-templates";
import type { MessageStatus } from "@/generated/prisma/client";
import { processMessageQueue, retryMessage } from "./messaging";

export async function listOutboundMessages(actor: Actor, opts: { status?: MessageStatus; page?: number }) {
  assertCan(actor, "mensajes.gestionar");
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.status ? { status: opts.status } : {};
  const [items, total, counts] = await Promise.all([
    db.outboundMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 30, skip: (page - 1) * 30 }),
    db.outboundMessage.count({ where }),
    db.outboundMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 30)), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
}

export async function retryOutboundMessage(actor: Actor, id: string) {
  assertCan(actor, "mensajes.gestionar");
  const msg = await db.outboundMessage.findUnique({ where: { id } });
  if (!msg) throw new NotFoundError("No encontramos el mensaje.");
  if (SECURITY_EVENTS.includes(msg.event as MessageEventKey)) {
    throw new ValidationError("Los correos de seguridad no se reenvían: la persona debe solicitar un nuevo enlace.");
  }
  await retryMessage(id);
  await audit(actor, { action: "mensajes.reintentar", entityType: "OutboundMessage", entityId: id });
  return processMessageQueue(5);
}

export async function listTemplates(actor: Actor) {
  assertCan(actor, "mensajes.gestionar");
  return db.messageTemplate.findMany({ orderBy: [{ event: "asc" }, { channel: "asc" }] });
}

const templateSchema = z.object({
  subject: z.string().trim().max(200).optional(),
  body: z.string({ error: "Escribe el texto del mensaje." }).trim().min(5, "Escribe el texto del mensaje.").max(4000),
  whatsappTemplateName: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z0-9_]*$/, "Usa solo minúsculas, números y guiones bajos, como en Meta.")
    .optional(),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

const CLINICAL_WORDS = /diagn[oó]stic|tratamiento|medicaci[oó]n|resultado de|enfermedad|patolog/i;

export async function updateTemplate(actor: Actor, id: string, input: unknown) {
  assertCan(actor, "mensajes.gestionar");
  const data = parseInput(templateSchema, input);
  if (CLINICAL_WORDS.test(data.body) || CLINICAL_WORDS.test(data.subject ?? "")) {
    throw new ValidationError("Las plantillas no deben incluir información clínica (diagnósticos, tratamientos o resultados).", {
      body: ["Quita las referencias a información clínica."],
    });
  }
  const t = await db.messageTemplate.findUnique({ where: { id } });
  if (!t) throw new NotFoundError("No encontramos la plantilla.");
  if (!data.body.includes("{{enlace}}") && ["ACCOUNT_VERIFICATION", "PASSWORD_RESET", "STAFF_INVITATION"].includes(t.event)) {
    throw new ValidationError("Esta plantilla debe incluir {{enlace}}.", { body: ["Incluye la variable {{enlace}}."] });
  }
  await db.messageTemplate.update({
    where: { id },
    data: { subject: data.subject || null, body: data.body, whatsappTemplateName: data.whatsappTemplateName || t.whatsappTemplateName, isActive: data.isActive, updatedById: actor.id },
  });
  await audit(actor, { action: "mensajes.plantilla_editar", entityType: "MessageTemplate", entityId: id, details: { evento: t.event, canal: t.channel } });
}
