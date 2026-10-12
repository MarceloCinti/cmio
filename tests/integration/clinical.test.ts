import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  addAddendum,
  addDiagnosis,
  exportClinicalRecord,
  finalizeEncounter,
  getClinicalRecord,
  getMyProgress,
  saveBackground,
  saveEncounterDraft,
  savePrescriptionDraft,
  saveVitals,
  setPortalProgress,
  startEncounterForAppointment,
  verifyClinicalDocument,
  voidClinicalOrder,
} from "@/server/services/clinical";
import { getDocumentForDownload, listMyDocuments, publishDocument, uploadDocument } from "@/server/services/documents";
import { bookAppointment } from "@/server/services/appointments";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { addDaysISO, localToUtc, todayISO } from "@/lib/time";
import { actorFor, createPatient, createProfessionalWithSchedule, createUser, resetDatabase } from "../helpers/db";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

function pdfForm(fields: Record<string, string>, content: Buffer = PDF, name = "resultado.pdf") {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  fd.set("file", new File([new Uint8Array(content)], name, { type: "application/pdf" }));
  return fd;
}

async function setup() {
  const { professional, service, user: doctorUser } = await createProfessionalWithSchedule({ withUser: true });
  const other = await createProfessionalWithSchedule({ withUser: true });
  const { patient, user: patientUser } = await createPatient({ withUser: true });
  const secretary = await actorFor((await createUser("SECRETARY")).id);
  const owner = await actorFor((await createUser("OWNER")).id);
  const doctor = await actorFor(doctorUser!.id);
  const otherDoctor = await actorFor(other.user!.id);
  const patientActor = await actorFor(patientUser!.id);
  const appt = await bookAppointment(secretary, {
    patientId: patient.id,
    professionalId: professional.id,
    serviceId: service.id,
    startsAt: localToUtc(addDaysISO(todayISO(), 2), 600).toISOString(),
  });
  return { professional, patient, doctor, otherDoctor, secretary, owner, patientActor, appt };
}

describe("Acceso a la historia clínica", () => {
  beforeEach(resetDatabase);

  it("solo el profesional con relación de atención accede y el acceso queda auditado", async () => {
    const s = await setup();
    await expect(getClinicalRecord(s.secretary, s.patient.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getClinicalRecord(s.owner, s.patient.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getClinicalRecord(s.otherDoctor, s.patient.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getClinicalRecord(s.patientActor, s.patient.id)).rejects.toBeInstanceOf(ForbiddenError);
    const record = await getClinicalRecord(s.doctor, s.patient.id);
    expect(record.patient.id).toBe(s.patient.id);
    expect(await db.auditLog.count({ where: { action: "clinica.ver_historia", patientId: s.patient.id, actorId: s.doctor.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "clinica.acceso_denegado", patientId: s.patient.id } })).toBeGreaterThanOrEqual(1);
  });

  it("los antecedentes se versionan sin sobrescribir la versión anterior", async () => {
    const s = await setup();
    await saveBackground(s.doctor, s.patient.id, { allergies: "Penicilina" });
    await saveBackground(s.doctor, s.patient.id, { allergies: "Penicilina, ibuprofeno" });
    const versions = await db.clinicalBackground.findMany({ where: { patientId: s.patient.id }, orderBy: { version: "asc" } });
    expect(versions.map((v) => [v.version, v.allergies])).toEqual([
      [1, "Penicilina"],
      [2, "Penicilina, ibuprofeno"],
    ]);
    await expect(db.clinicalBackground.update({ where: { id: versions[0].id }, data: { allergies: "x" } })).rejects.toThrow(/CMIO_INMUTABLE/);
  });
});

describe("Consultas", () => {
  beforeEach(resetDatabase);

  it("registra una consulta completa y la bloquea al finalizar", async () => {
    const s = await setup();
    const enc = await startEncounterForAppointment(s.doctor, s.appt.id);
    await expect(startEncounterForAppointment(s.otherDoctor, s.appt.id)).rejects.toBeInstanceOf(ForbiddenError);
    await saveEncounterDraft(s.doctor, enc.id, {
      reason: "Control metabólico",
      assessment: "Evaluación de prueba",
      plan: "Plan de prueba",
      patientInstructions: "Indicaciones de prueba",
      sharePatientInstructions: "on",
    });
    await saveVitals(s.doctor, enc.id, { weightKg: "92,5", heightCm: "170", systolic: "120", diastolic: "80" });
    const vitals = await db.vitalSign.findFirstOrThrow({ where: { encounterId: enc.id } });
    expect(Number(vitals.bmi)).toBe(32);
    await addDiagnosis(s.doctor, enc.id, { code: "e66.9", description: "Diagnóstico de prueba", kind: "PRINCIPAL", certainty: "PRESUMPTIVE" });
    await savePrescriptionDraft(s.doctor, enc.id, { items: [{ medication: "Medicamento de prueba", dose: "1 comprimido" }] });
    await expect(saveEncounterDraft(s.otherDoctor, enc.id, { reason: "x" })).rejects.toBeInstanceOf(ForbiddenError);

    await finalizeEncounter(s.doctor, enc.id);
    const final = await db.encounter.findUniqueOrThrow({ where: { id: enc.id }, include: { prescriptions: true, diagnoses: true } });
    expect(final.status).toBe("FINALIZED");
    expect(final.diagnoses[0].code).toBe("E66.9");
    expect(final.prescriptions[0].status).toBe("ISSUED");

    // No se puede modificar por la aplicación…
    await expect(saveEncounterDraft(s.doctor, enc.id, { reason: "Cambio" })).rejects.toBeInstanceOf(ConflictError);
    await expect(saveVitals(s.doctor, enc.id, { weightKg: "80" })).rejects.toBeInstanceOf(ConflictError);
    // …ni directamente en la base de datos.
    await expect(db.encounter.update({ where: { id: enc.id }, data: { assessment: "alterado" } })).rejects.toThrow(/CMIO_CONSULTA_FINALIZADA/);
    await expect(db.vitalSign.update({ where: { id: vitals.id }, data: { weightKg: 50 } })).rejects.toThrow(/CMIO_CONSULTA_FINALIZADA/);
    await expect(db.diagnosis.deleteMany({ where: { encounterId: enc.id } })).rejects.toThrow(/CMIO_CONSULTA_FINALIZADA/);

    // Las correcciones se registran como adendas con autor y fecha.
    await addAddendum(s.doctor, enc.id, { content: "Corrección de prueba", reason: "Error de tipeo" });
    const addenda = await db.encounterAddendum.findMany({ where: { encounterId: enc.id } });
    expect(addenda).toHaveLength(1);
    expect(addenda[0].authorId).toBe(s.doctor.id);
    await expect(db.encounterAddendum.delete({ where: { id: addenda[0].id } })).rejects.toThrow(/CMIO_INMUTABLE/);
  });

  it("exige contenido clínico mínimo para finalizar", async () => {
    const s = await setup();
    const enc = await startEncounterForAppointment(s.doctor, s.appt.id);
    await expect(finalizeEncounter(s.doctor, enc.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("las recetas emitidas solo pueden anularse por su autor y conservan su contenido", async () => {
    const s = await setup();
    const enc = await startEncounterForAppointment(s.doctor, s.appt.id);
    await saveEncounterDraft(s.doctor, enc.id, { reason: "Control", plan: "Plan" });
    await savePrescriptionDraft(s.doctor, enc.id, { items: [{ medication: "Medicamento A" }] });
    await finalizeEncounter(s.doctor, enc.id);
    const rx = await db.prescription.findFirstOrThrow({ where: { encounterId: enc.id } });
    const verified = await verifyClinicalDocument(rx.verificationCode);
    expect(verified?.kind).toBe("Receta");
    expect(verified?.status).toBe("ISSUED");
    await expect(voidClinicalOrder(s.otherDoctor, "prescription", rx.id, { reason: "Prueba" })).rejects.toBeInstanceOf(ForbiddenError);
    await voidClinicalOrder(s.doctor, "prescription", rx.id, { reason: "Dosis incorrecta" });
    expect((await verifyClinicalDocument(rx.verificationCode))?.status).toBe("VOIDED");
    await expect(db.prescriptionItem.updateMany({ where: { prescriptionId: rx.id }, data: { medication: "Otro" } })).rejects.toThrow(/CMIO_ORDEN/);
  });

  it("el seguimiento solo se muestra al paciente cuando el profesional lo habilita", async () => {
    const s = await setup();
    expect(await getMyProgress(s.patientActor)).toBeNull();
    await setPortalProgress(s.doctor, s.patient.id, true);
    const progress = await getMyProgress(s.patientActor);
    expect(progress).not.toBeNull();
    await expect(setPortalProgress(s.secretary, s.patient.id, true)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Documentos clínicos", () => {
  beforeEach(resetDatabase);

  it("la secretaría sube para revisión; el paciente solo accede tras la publicación profesional", async () => {
    const s = await setup();
    const doc = await uploadDocument(s.secretary, s.patient.id, pdfForm({ title: "Resultado de laboratorio", category: "LAB_RESULT", publishNow: "on" }));
    expect(doc.status).toBe("PENDING_REVIEW"); // la secretaría no puede publicar
    expect(await listMyDocuments(s.patientActor)).toHaveLength(0);
    await expect(getDocumentForDownload(s.patientActor, doc.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getDocumentForDownload(s.secretary, doc.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(publishDocument(s.secretary, doc.id)).rejects.toBeInstanceOf(ForbiddenError);

    await publishDocument(s.doctor, doc.id);
    const mine = await listMyDocuments(s.patientActor);
    expect(mine).toHaveLength(1);
    const dl = await getDocumentForDownload(s.patientActor, doc.id);
    expect(dl.content.subarray(0, 4).toString()).toBe("%PDF");
    expect(await db.auditLog.count({ where: { action: "documentos.descargar", entityId: doc.id } })).toBe(1);

    // Otro paciente no puede acceder
    const other = await createPatient({ withUser: true });
    await expect(getDocumentForDownload(await actorFor(other.user!.id), doc.id)).rejects.toBeInstanceOf(NotFoundError);
    // El aviso al paciente no revela el contenido
    const notice = await db.notification.findFirstOrThrow({ where: { userId: s.patientActor.id, title: "Nuevo documento disponible" } });
    expect(notice.body).not.toContain("laboratorio");
  });

  it("rechaza archivos cuyo contenido no corresponde a un formato permitido", async () => {
    const s = await setup();
    const fake = Buffer.from("<script>alert(1)</script>");
    await expect(
      uploadDocument(s.doctor, s.patient.id, pdfForm({ title: "Falso", category: "OTHER" }, fake, "falso.pdf")),
    ).rejects.toBeInstanceOf(ValidationError);
    const big = Buffer.concat([PDF, Buffer.alloc(11 * 1024 * 1024)]);
    await expect(uploadDocument(s.doctor, s.patient.id, pdfForm({ title: "Grande", category: "OTHER" }, big))).rejects.toThrow(/tamaño máximo/);
  });
});

describe("Exportación de historias clínicas", () => {
  beforeEach(resetDatabase);

  it("requiere autorización específica y motivo, y queda registrada", async () => {
    const s = await setup();
    const admin = await actorFor((await createUser("ADMIN")).id);
    await expect(exportClinicalRecord(admin, s.patient.id, { reason: "Prueba" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(exportClinicalRecord(s.owner, s.patient.id, { reason: "" })).rejects.toBeInstanceOf(ValidationError);
    const data = await exportClinicalRecord(s.owner, s.patient.id, { reason: "Solicitud escrita del paciente" });
    expect(data.id).toBe(s.patient.id);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "clinica.exportar", patientId: s.patient.id } });
    expect(log.details).toMatchObject({ motivo: "Solicitud escrita del paciente" });
  });
});
