import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import type { Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { NotFoundError } from "@/server/errors";
import { assertClinicalAccess } from "./clinical";
import { getSiteContent } from "./settings";
import { professionalDisplayName } from "./public-site";

const profSelect = { honorific: true, firstName: true, lastName: true, licenseNumber: true, credentialsVerifiedAt: true } as const;
const patientSelect = { firstName: true, lastName: true, documentNumber: true, birthDate: true } as const;

async function common(actor: Actor, patientId: string, kind: string, id: string) {
  await assertClinicalAccess(actor, patientId);
  await audit(actor, { action: `clinica.imprimir_${kind}`, entityType: kind, entityId: id, patientId });
  const { institution } = await getSiteContent("published");
  return { institution, verifyBase: `${env().APP_URL}/verificar` };
}

export async function getPrescriptionForPrint(actor: Actor, id: string) {
  const rx = await db.prescription.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } }, professional: { select: profSelect }, patient: { select: patientSelect } },
  });
  if (!rx) throw new NotFoundError();
  const { institution, verifyBase } = await common(actor, rx.patientId, "receta", id);
  return { rx, institution, verifyUrl: `${verifyBase}/${rx.verificationCode}`, professionalName: professionalDisplayName(rx.professional) };
}

export async function getStudyOrderForPrint(actor: Actor, id: string) {
  const order = await db.studyOrder.findUnique({
    where: { id },
    include: { professional: { select: profSelect }, patient: { select: patientSelect } },
  });
  if (!order) throw new NotFoundError();
  const { institution, verifyBase } = await common(actor, order.patientId, "orden", id);
  return { order, institution, verifyUrl: `${verifyBase}/${order.verificationCode}`, professionalName: professionalDisplayName(order.professional) };
}
