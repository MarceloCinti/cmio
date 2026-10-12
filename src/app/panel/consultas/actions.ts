"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import { formDataToObject } from "@/lib/form-data";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/server/auth/current";
import {
  addAddendum,
  addDiagnosis,
  createEncounter,
  createGoal,
  deleteDraftPrescription,
  deleteDraftStudyOrder,
  finalizeEncounter,
  removeDiagnosis,
  saveBackground,
  saveEncounterDraft,
  savePrescriptionDraft,
  saveStudyOrderDraft,
  saveVitals,
  setPortalProgress,
  updateGoalStatus,
  voidClinicalOrder,
} from "@/server/services/clinical";
import { publishDocument, uploadDocument, withdrawDocument } from "@/server/services/documents";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export async function saveBackgroundAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const patientId = str(fd, "patientId");
  return runAction(async () => {
    await saveBackground(actor, patientId, formDataToObject(fd));
    revalidatePath(`/panel/pacientes/${patientId}/historia`);
  }, "Antecedentes guardados como nueva versión.");
}

export async function newEncounterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  let id = "";
  const result = await runAction(async () => {
    id = (await createEncounter(actor, str(fd, "patientId"))).id;
  });
  if (result?.ok) redirect(`/panel/consultas/${id}`);
  return result;
}

export async function saveEncounterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await saveEncounterDraft(actor, id, formDataToObject(fd));
    revalidatePath(`/panel/consultas/${id}`);
  }, "Borrador guardado.");
}

export async function saveVitalsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await saveVitals(actor, id, formDataToObject(fd));
    revalidatePath(`/panel/consultas/${id}`);
  }, "Signos vitales y medidas guardados.");
}

export async function addDiagnosisAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await addDiagnosis(actor, id, formDataToObject(fd));
    revalidatePath(`/panel/consultas/${id}`);
  }, "Diagnóstico agregado.");
}

export async function removeDiagnosisAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await removeDiagnosis(actor, str(fd, "diagnosisId"));
    revalidatePath(`/panel/consultas/${str(fd, "encounterId")}`);
  }, "Diagnóstico quitado.");
}

export async function savePrescriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  const meds = fd.getAll("medication[]").map(String);
  const items = meds
    .map((medication, i) => ({
      medication,
      dose: String(fd.getAll("dose[]")[i] ?? ""),
      frequency: String(fd.getAll("frequency[]")[i] ?? ""),
      duration: String(fd.getAll("duration[]")[i] ?? ""),
      quantity: String(fd.getAll("quantity[]")[i] ?? ""),
      instructions: String(fd.getAll("instructions[]")[i] ?? ""),
    }))
    .filter((it) => it.medication.trim());
  return runAction(async () => {
    await savePrescriptionDraft(actor, id, { items, notes: str(fd, "notes") || undefined });
    revalidatePath(`/panel/consultas/${id}`);
  }, "Receta guardada en borrador. Se emitirá al finalizar la consulta.");
}

export async function deletePrescriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteDraftPrescription(actor, str(fd, "prescriptionId"));
    revalidatePath(`/panel/consultas/${str(fd, "encounterId")}`);
  }, "Borrador de receta eliminado.");
}

export async function saveStudyOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await saveStudyOrderDraft(actor, id, formDataToObject(fd));
    revalidatePath(`/panel/consultas/${id}`);
  }, "Orden de estudios guardada en borrador.");
}

export async function deleteStudyOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await deleteDraftStudyOrder(actor, str(fd, "orderId"));
    revalidatePath(`/panel/consultas/${str(fd, "encounterId")}`);
  }, "Borrador de orden eliminado.");
}

export async function finalizeEncounterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await finalizeEncounter(actor, id);
    revalidatePath(`/panel/consultas/${id}`);
  }, "Consulta finalizada. A partir de ahora solo se pueden agregar adendas.");
}

export async function addAddendumAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const id = str(fd, "encounterId");
  return runAction(async () => {
    await addAddendum(actor, id, formDataToObject(fd));
    revalidatePath(`/panel/consultas/${id}`);
  }, "Adenda registrada.");
}

export async function voidOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await voidClinicalOrder(actor, str(fd, "kind") === "study" ? "study" : "prescription", str(fd, "id"), { reason: str(fd, "reason") });
    revalidatePath(`/panel/consultas/${str(fd, "encounterId")}`);
  }, "Documento anulado.");
}

export async function createGoalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const patientId = str(fd, "patientId");
  return runAction(async () => {
    await createGoal(actor, patientId, formDataToObject(fd));
    revalidatePath(`/panel/pacientes/${patientId}/historia`);
  }, "Objetivo registrado.");
}

export async function updateGoalAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const status = str(fd, "status");
  return runAction(async () => {
    if (!["ACTIVE", "ACHIEVED", "DISCONTINUED"].includes(status)) throw new Error("Estado inválido");
    await updateGoalStatus(actor, str(fd, "goalId"), status as "ACHIEVED");
    revalidatePath(`/panel/pacientes/${str(fd, "patientId")}/historia`);
  }, "Objetivo actualizado.");
}

export async function setPortalProgressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const patientId = str(fd, "patientId");
  const enabled = str(fd, "enabled") === "true";
  return runAction(async () => {
    await setPortalProgress(actor, patientId, enabled);
    revalidatePath(`/panel/pacientes/${patientId}/historia`);
  }, enabled ? "El paciente ahora puede ver su seguimiento en el portal." : "Seguimiento oculto en el portal del paciente.");
}

export async function uploadDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const patientId = str(fd, "patientId");
  return runAction(async () => {
    await uploadDocument(actor, patientId, fd);
    revalidatePath(`/panel/pacientes/${patientId}/documentos`);
  }, "Documento subido correctamente.");
}

export async function publishDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await publishDocument(actor, str(fd, "documentId"));
    revalidatePath(`/panel/pacientes/${str(fd, "patientId")}/documentos`);
  }, "Documento publicado. El paciente fue notificado sin detalles del contenido.");
}

export async function withdrawDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  return runAction(async () => {
    await withdrawDocument(actor, str(fd, "documentId"), { reason: str(fd, "reason") });
    revalidatePath(`/panel/pacientes/${str(fd, "patientId")}/documentos`);
  }, "Documento retirado del portal.");
}
