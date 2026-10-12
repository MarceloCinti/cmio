import "server-only";
import { db, type Tx } from "@/server/db";
import { parseInput } from "@/server/action";
import { assertCan, assertClinician, can, isClinician, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import { generateReadableCode } from "@/server/auth/crypto";
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import {
  addendumSchema,
  backgroundSchema,
  computeBmi,
  diagnosisSchema,
  encounterSchema,
  exportSchema,
  goalSchema,
  prescriptionItemSchema,
  studyOrderSchema,
  vitalsSchema,
} from "@/lib/validation/clinical";
import { z } from "@/lib/validation/zod-es";
import { isoToDbDate } from "@/lib/time";
import { changeAppointmentStatus } from "./appointments";

// ─────────────────────────────────────────────────────────────
// Control de acceso a la historia clínica
// ─────────────────────────────────────────────────────────────

/**
 * Solo pueden acceder profesionales de la salud con relación de atención con el
 * paciente (citas registradas o consultas propias). La secretaría y la
 * administración no acceden a contenido clínico.
 */
export async function hasClinicalAccess(actor: Actor, patientId: string) {
  if (!isClinician(actor)) return false;
  const professionalId = actor.professionalId!;
  const [encounters, appts] = await Promise.all([
    db.encounter.count({ where: { patientId, professionalId } }),
    db.appointment.count({
      where: {
        patientId,
        professionalId,
        // Las citas canceladas no generan relación de atención. Una cita que el propio
        // profesional agendó solo cuenta cuando el paciente llegó o fue atendido.
        status: { not: "CANCELLED" },
        OR: [{ createdById: null }, { createdById: { not: actor.id } }, { status: { in: ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"] } }],
      },
    }),
  ]);
  return encounters + appts > 0;
}

export async function assertClinicalAccess(actor: Actor, patientId: string) {
  assertClinician(actor);
  if (!(await hasClinicalAccess(actor, patientId))) {
    await audit(actor, { action: "clinica.acceso_denegado", entityType: "Patient", entityId: patientId, patientId, success: false });
    throw new ForbiddenError("No tienes relación de atención con este paciente. Solo los profesionales que lo atienden pueden ver su historia clínica.");
  }
}

async function loadEncounterForEdit(actor: Actor, encounterId: string, tx?: Tx) {
  const client = tx ?? db;
  const enc = await client.encounter.findUnique({ where: { id: encounterId } });
  if (!enc) throw new NotFoundError("No encontramos la consulta.");
  assertClinician(actor);
  if (enc.professionalId !== actor.professionalId) {
    throw new ForbiddenError("Solo el profesional que realiza la consulta puede editarla.");
  }
  if (enc.status === "FINALIZED") {
    throw new ConflictError("La consulta está finalizada y no puede modificarse. Si necesitas corregir algo, agrega una adenda.");
  }
  return enc;
}

// ─────────────────────────────────────────────────────────────
// Historia clínica
// ─────────────────────────────────────────────────────────────

export async function getClinicalRecord(actor: Actor, patientId: string) {
  await assertClinicalAccess(actor, patientId);
  const [patient, background, backgroundVersions, encounters, vitals, goals] = await Promise.all([
    db.patient.findUniqueOrThrow({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, birthDate: true, sex: true, documentNumber: true, portalProgressEnabled: true },
    }),
    db.clinicalBackground.findFirst({ where: { patientId }, orderBy: { version: "desc" } }),
    db.clinicalBackground.count({ where: { patientId } }),
    db.encounter.findMany({
      where: { patientId },
      orderBy: { startedAt: "desc" },
      include: {
        professional: { select: { honorific: true, firstName: true, lastName: true } },
        diagnoses: true,
        _count: { select: { addenda: true, prescriptions: true, studyOrders: true } },
      },
    }),
    db.vitalSign.findMany({ where: { patientId }, orderBy: { measuredAt: "asc" } }),
    db.treatmentGoal.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, include: { professional: { select: { honorific: true, firstName: true, lastName: true } } } }),
  ]);
  await audit(actor, { action: "clinica.ver_historia", entityType: "Patient", entityId: patientId, patientId });
  return { patient, background, backgroundVersions, encounters, vitals, goals };
}

export async function listBackgroundVersions(actor: Actor, patientId: string) {
  await assertClinicalAccess(actor, patientId);
  return db.clinicalBackground.findMany({ where: { patientId }, orderBy: { version: "desc" } });
}

/** Guarda los antecedentes como una nueva versión (nunca sobrescribe la anterior). */
export async function saveBackground(actor: Actor, patientId: string, input: unknown) {
  await assertClinicalAccess(actor, patientId);
  const data = parseInput(backgroundSchema, input);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`antecedentes:${patientId}`}))`;
    const last = await tx.clinicalBackground.findFirst({ where: { patientId }, orderBy: { version: "desc" }, select: { version: true } });
    const created = await tx.clinicalBackground.create({
      data: { patientId, version: (last?.version ?? 0) + 1, ...data, authorId: actor.id, authorName: actor.name },
    });
    await audit(actor, { action: "clinica.antecedentes_version", entityType: "ClinicalBackground", entityId: created.id, patientId, details: { version: created.version } }, tx);
  });
}

// ─────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────

export async function startEncounterForAppointment(actor: Actor, appointmentId: string) {
  assertClinician(actor);
  const appt = await db.appointment.findUnique({ where: { id: appointmentId }, include: { service: true, encounter: true } });
  if (!appt) throw new NotFoundError("No encontramos la cita.");
  if (appt.professionalId !== actor.professionalId) throw new ForbiddenError("La cita corresponde a otro profesional.");
  if (appt.encounter) return appt.encounter;
  if (!["CHECKED_IN", "IN_PROGRESS", "CONFIRMED", "SCHEDULED", "COMPLETED"].includes(appt.status)) {
    throw new ConflictError("No se puede registrar una consulta para una cita cancelada o ausente.");
  }
  const encounter = await db.encounter.create({
    data: {
      patientId: appt.patientId,
      professionalId: appt.professionalId,
      appointmentId: appt.id,
      reason: appt.service.name,
      authorId: actor.id,
      authorName: actor.name,
    },
  });
  await audit(actor, { action: "clinica.consulta_iniciada", entityType: "Encounter", entityId: encounter.id, patientId: appt.patientId });
  return encounter;
}

/** Nueva evolución sin cita previa (solo para pacientes con relación de atención). */
export async function createEncounter(actor: Actor, patientId: string) {
  await assertClinicalAccess(actor, patientId);
  const encounter = await db.encounter.create({
    data: { patientId, professionalId: actor.professionalId!, reason: "Evolución", authorId: actor.id, authorName: actor.name },
  });
  await audit(actor, { action: "clinica.consulta_creada", entityType: "Encounter", entityId: encounter.id, patientId });
  return encounter;
}

export async function getEncounter(actor: Actor, encounterId: string) {
  const enc = await db.encounter.findUnique({
    where: { id: encounterId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, birthDate: true, sex: true, documentNumber: true } },
      professional: { select: { id: true, honorific: true, firstName: true, lastName: true, licenseNumber: true, credentialsVerifiedAt: true } },
      appointment: { select: { id: true, status: true, startsAt: true, code: true } },
      vitalSigns: { orderBy: { measuredAt: "desc" } },
      diagnoses: { orderBy: { createdAt: "asc" } },
      prescriptions: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "asc" } },
      studyOrders: { orderBy: { createdAt: "asc" } },
      addenda: { orderBy: { createdAt: "asc" } },
      documents: { select: { id: true, title: true, status: true, category: true, createdAt: true } },
    },
  });
  if (!enc) throw new NotFoundError("No encontramos la consulta.");
  await assertClinicalAccess(actor, enc.patientId);
  await audit(actor, { action: "clinica.ver_consulta", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
  return enc;
}

export async function saveEncounterDraft(actor: Actor, encounterId: string, input: unknown) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  const data = parseInput(encounterSchema, input);
  await db.encounter.update({
    where: { id: encounterId },
    data: {
      reason: data.reason,
      currentIllness: data.currentIllness ?? null,
      physicalExam: data.physicalExam ?? null,
      assessment: data.assessment ?? null,
      plan: data.plan ?? null,
      followUpInstructions: data.followUpInstructions ?? null,
      patientInstructions: data.patientInstructions ?? null,
      sharePatientInstructions: data.sharePatientInstructions,
      clinicalNotes: data.clinicalNotes ?? null,
      nextEvaluationDate: data.nextEvaluationDate ? isoToDbDate(data.nextEvaluationDate) : null,
    },
  });
  await audit(actor, { action: "clinica.consulta_guardada", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
}

export async function saveVitals(actor: Actor, encounterId: string, input: unknown) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  const v = parseInput(vitalsSchema, input);
  if (Object.values(v).every((x) => x === undefined)) {
    throw new ValidationError("Ingresa al menos un valor de signos vitales o medidas.");
  }
  if (v.systolic !== undefined && v.diastolic !== undefined && v.diastolic >= v.systolic) {
    throw new ValidationError("La presión diastólica debe ser menor que la sistólica.", { diastolic: ["Debe ser menor que la sistólica."] });
  }
  const bmi = computeBmi(v.weightKg, v.heightCm);
  await db.$transaction(async (tx) => {
    // Un registro de signos vitales por consulta mientras está en borrador.
    await tx.vitalSign.deleteMany({ where: { encounterId } });
    await tx.vitalSign.create({
      data: { ...v, bmi, patientId: enc.patientId, encounterId, measuredAt: new Date(), recordedById: actor.id },
    });
  });
  await audit(actor, { action: "clinica.signos_vitales", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
}

export async function addDiagnosis(actor: Actor, encounterId: string, input: unknown) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  const d = parseInput(diagnosisSchema, input);
  await db.diagnosis.create({ data: { ...d, code: d.code ?? null, encounterId, patientId: enc.patientId } });
  await audit(actor, { action: "clinica.diagnostico_agregado", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
}

export async function removeDiagnosis(actor: Actor, diagnosisId: string) {
  const d = await db.diagnosis.findUnique({ where: { id: diagnosisId } });
  if (!d) throw new NotFoundError("No encontramos el diagnóstico.");
  await loadEncounterForEdit(actor, d.encounterId);
  await db.diagnosis.delete({ where: { id: diagnosisId } });
  await audit(actor, { action: "clinica.diagnostico_quitado", entityType: "Encounter", entityId: d.encounterId, patientId: d.patientId });
}

async function uniqueVerificationCode(tx: Tx) {
  for (let i = 0; i < 5; i++) {
    const code = generateReadableCode(10);
    const [a, b] = await Promise.all([
      tx.prescription.findUnique({ where: { verificationCode: code }, select: { id: true } }),
      tx.studyOrder.findUnique({ where: { verificationCode: code }, select: { id: true } }),
    ]);
    if (!a && !b) return code;
  }
  throw new AppError("No se pudo generar el código de verificación.");
}

const prescriptionInputSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
  items: z.array(prescriptionItemSchema).min(1, "Agrega al menos un medicamento.").max(15),
});

/** Crea o reemplaza el borrador de receta de la consulta. */
export async function savePrescriptionDraft(actor: Actor, encounterId: string, input: unknown) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  const data = parseInput(prescriptionInputSchema, input);
  await db.$transaction(async (tx) => {
    let rx = await tx.prescription.findFirst({ where: { encounterId, status: "DRAFT" } });
    if (!rx) {
      rx = await tx.prescription.create({
        data: { encounterId, patientId: enc.patientId, professionalId: enc.professionalId, verificationCode: await uniqueVerificationCode(tx) },
      });
    }
    await tx.prescriptionItem.deleteMany({ where: { prescriptionId: rx.id } });
    await tx.prescriptionItem.createMany({
      data: data.items.map((it, i) => ({
        prescriptionId: rx.id,
        medication: it.medication,
        dose: it.dose ?? null,
        frequency: it.frequency ?? null,
        duration: it.duration ?? null,
        quantity: it.quantity ?? null,
        instructions: it.instructions ?? null,
        sortOrder: i,
      })),
    });
    await tx.prescription.update({ where: { id: rx.id }, data: { notes: data.notes ?? null } });
  });
  await audit(actor, { action: "clinica.receta_borrador", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
}

export async function deleteDraftPrescription(actor: Actor, prescriptionId: string) {
  const rx = await db.prescription.findUnique({ where: { id: prescriptionId } });
  if (!rx || rx.status !== "DRAFT") throw new NotFoundError("No encontramos la receta en borrador.");
  await loadEncounterForEdit(actor, rx.encounterId);
  await db.prescription.delete({ where: { id: prescriptionId } });
}

export async function saveStudyOrderDraft(actor: Actor, encounterId: string, input: unknown) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  const data = parseInput(studyOrderSchema, input);
  if (!data.studies.length) throw new ValidationError("Indica al menos un estudio.", { studies: ["Indica al menos un estudio."] });
  await db.$transaction(async (tx) => {
    const existing = await tx.studyOrder.findFirst({ where: { encounterId, status: "DRAFT" } });
    if (existing) {
      await tx.studyOrder.update({ where: { id: existing.id }, data: { studies: data.studies, indication: data.indication ?? null, isUrgent: data.isUrgent } });
    } else {
      await tx.studyOrder.create({
        data: {
          encounterId,
          patientId: enc.patientId,
          professionalId: enc.professionalId,
          verificationCode: await uniqueVerificationCode(tx),
          studies: data.studies,
          indication: data.indication ?? null,
          isUrgent: data.isUrgent,
        },
      });
    }
  });
  await audit(actor, { action: "clinica.orden_borrador", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId });
}

export async function deleteDraftStudyOrder(actor: Actor, orderId: string) {
  const order = await db.studyOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "DRAFT") throw new NotFoundError("No encontramos la orden en borrador.");
  await loadEncounterForEdit(actor, order.encounterId);
  await db.studyOrder.delete({ where: { id: orderId } });
}

/**
 * Finaliza la consulta: emite recetas y órdenes en borrador y bloquea el registro
 * (a partir de aquí solo se admiten adendas). Si la cita está en atención, se finaliza.
 */
export async function finalizeEncounter(actor: Actor, encounterId: string) {
  const enc = await loadEncounterForEdit(actor, encounterId);
  if (!enc.reason?.trim()) throw new ValidationError("Indica el motivo de consulta antes de finalizar.");
  if (!enc.assessment?.trim() && !enc.plan?.trim() && !enc.clinicalNotes?.trim()) {
    throw new ValidationError("Antes de finalizar, completa la evaluación clínica, el plan de atención o una nota clínica.");
  }
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.prescription.updateMany({ where: { encounterId, status: "DRAFT" }, data: { status: "ISSUED", issuedAt: now } });
    await tx.studyOrder.updateMany({ where: { encounterId, status: "DRAFT" }, data: { status: "ISSUED", issuedAt: now } });
    const res = await tx.encounter.updateMany({ where: { id: encounterId, status: "DRAFT" }, data: { status: "FINALIZED", finalizedAt: now } });
    if (res.count !== 1) throw new ConflictError("La consulta ya fue finalizada.");
    await audit(actor, { action: "clinica.consulta_finalizada", entityType: "Encounter", entityId: encounterId, patientId: enc.patientId }, tx);
  });
  if (enc.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: enc.appointmentId }, select: { status: true } });
    if (appt?.status === "IN_PROGRESS") await changeAppointmentStatus(actor, enc.appointmentId, "COMPLETED");
  }
}

export async function addAddendum(actor: Actor, encounterId: string, input: unknown) {
  const enc = await db.encounter.findUnique({ where: { id: encounterId } });
  if (!enc) throw new NotFoundError("No encontramos la consulta.");
  await assertClinicalAccess(actor, enc.patientId);
  if (enc.status !== "FINALIZED") throw new ConflictError("La consulta todavía está en borrador: puedes editarla directamente.");
  const data = parseInput(addendumSchema, input);
  const add = await db.encounterAddendum.create({
    data: { encounterId, content: data.content, reason: data.reason ?? null, authorId: actor.id, authorName: actor.name },
  });
  await audit(actor, { action: "clinica.adenda", entityType: "EncounterAddendum", entityId: add.id, patientId: enc.patientId });
}

const voidSchema = z.object({ reason: z.string().trim().min(3, "Indica el motivo de la anulación.").max(300) });

export async function voidClinicalOrder(actor: Actor, kind: "prescription" | "study", id: string, input: unknown) {
  const { reason } = parseInput(voidSchema, input);
  const record =
    kind === "prescription"
      ? await db.prescription.findUnique({ where: { id } })
      : await db.studyOrder.findUnique({ where: { id } });
  if (!record) throw new NotFoundError("No encontramos el documento.");
  assertClinician(actor);
  if (record.professionalId !== actor.professionalId) throw new ForbiddenError("Solo el profesional que emitió el documento puede anularlo.");
  if (record.status !== "ISSUED") throw new ConflictError("Solo se pueden anular documentos emitidos.");
  const data = { status: "VOIDED" as const, voidedAt: new Date(), voidReason: reason };
  if (kind === "prescription") await db.prescription.update({ where: { id }, data });
  else await db.studyOrder.update({ where: { id }, data });
  await audit(actor, { action: kind === "prescription" ? "clinica.receta_anulada" : "clinica.orden_anulada", entityType: kind, entityId: id, patientId: record.patientId, details: { motivo: reason } });
}

// ─────────────────────────────────────────────────────────────
// Seguimiento
// ─────────────────────────────────────────────────────────────

export async function createGoal(actor: Actor, patientId: string, input: unknown) {
  await assertClinicalAccess(actor, patientId);
  const g = parseInput(goalSchema, input);
  const goal = await db.treatmentGoal.create({
    data: {
      patientId,
      professionalId: actor.professionalId!,
      description: g.description,
      metric: g.metric,
      targetValue: g.targetValue ?? null,
      targetDate: g.targetDate ? isoToDbDate(g.targetDate) : null,
      visibleToPatient: g.visibleToPatient,
    },
  });
  await audit(actor, { action: "clinica.objetivo_creado", entityType: "TreatmentGoal", entityId: goal.id, patientId });
}

export async function updateGoalStatus(actor: Actor, goalId: string, status: "ACTIVE" | "ACHIEVED" | "DISCONTINUED") {
  const goal = await db.treatmentGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new NotFoundError("No encontramos el objetivo.");
  await assertClinicalAccess(actor, goal.patientId);
  await db.treatmentGoal.update({ where: { id: goalId }, data: { status } });
  await audit(actor, { action: "clinica.objetivo_estado", entityType: "TreatmentGoal", entityId: goalId, patientId: goal.patientId, details: { estado: status } });
}

export async function setPortalProgress(actor: Actor, patientId: string, enabled: boolean) {
  await assertClinicalAccess(actor, patientId);
  await db.patient.update({ where: { id: patientId }, data: { portalProgressEnabled: enabled } });
  await audit(actor, { action: "clinica.portal_seguimiento", entityType: "Patient", entityId: patientId, patientId, details: { habilitado: enabled } });
}

/** Información de seguimiento visible para el paciente (solo si el equipo la habilitó). */
export async function getMyProgress(actor: Actor) {
  if (actor.role !== "PATIENT" || !actor.patientId) throw new ForbiddenError();
  const patient = await db.patient.findUniqueOrThrow({ where: { id: actor.patientId }, select: { portalProgressEnabled: true } });
  if (!patient.portalProgressEnabled) return null;
  const [vitals, goals, nextEvaluations, instructions] = await Promise.all([
    db.vitalSign.findMany({
      where: { patientId: actor.patientId, encounter: { status: "FINALIZED" } },
      orderBy: { measuredAt: "asc" },
      select: { measuredAt: true, weightKg: true, bmi: true, waistCm: true },
    }),
    db.treatmentGoal.findMany({
      where: { patientId: actor.patientId, visibleToPatient: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, description: true, metric: true, targetValue: true, targetDate: true, status: true, createdAt: true },
    }),
    db.encounter.findMany({
      where: { patientId: actor.patientId, status: "FINALIZED", nextEvaluationDate: { gte: isoToDbDate(new Date().toISOString().slice(0, 10)) } },
      select: { nextEvaluationDate: true, professional: { select: { honorific: true, firstName: true, lastName: true } } },
      orderBy: { nextEvaluationDate: "asc" },
    }),
    db.encounter.findMany({
      where: { patientId: actor.patientId, status: "FINALIZED", sharePatientInstructions: true, patientInstructions: { not: null } },
      select: { id: true, patientInstructions: true, finalizedAt: true, professional: { select: { honorific: true, firstName: true, lastName: true } } },
      orderBy: { finalizedAt: "desc" },
      take: 5,
    }),
  ]);
  await audit(actor, { action: "portal.ver_seguimiento", patientId: actor.patientId });
  return { vitals, goals, nextEvaluations, instructions };
}

// ─────────────────────────────────────────────────────────────
// Exportación (autorización específica y registro)
// ─────────────────────────────────────────────────────────────

export async function exportClinicalRecord(actor: Actor, patientId: string, input: unknown) {
  // Requiere el permiso específico y, además, ser un profesional con relación de atención:
  // ningún rol administrativo accede al contenido clínico, ni siquiera para exportarlo.
  assertCan(actor, "clinica.exportar", "No tienes autorización para exportar historias clínicas.");
  await assertClinicalAccess(actor, patientId);
  const { reason } = parseInput(exportSchema, input);
  const data = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      backgrounds: { orderBy: { version: "asc" } },
      encounters: {
        orderBy: { startedAt: "asc" },
        include: {
          professional: { select: { honorific: true, firstName: true, lastName: true, licenseNumber: true } },
          vitalSigns: true,
          diagnoses: true,
          prescriptions: { include: { items: true } },
          studyOrders: true,
          addenda: true,
        },
      },
      goals: true,
      documents: { select: { id: true, title: true, category: true, status: true, createdAt: true, publishedAt: true } },
    },
  });
  if (!data) throw new NotFoundError("No encontramos al paciente.");
  await audit(actor, {
    action: "clinica.exportar",
    entityType: "Patient",
    entityId: patientId,
    patientId,
    details: { motivo: reason, consultas: data.encounters.length },
  });
  return data;
}

export type ClinicalExport = Awaited<ReturnType<typeof exportClinicalRecord>>;

/** Verificación pública de recetas y órdenes impresas (sin datos clínicos). */
export async function verifyClinicalDocument(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{10}$/.test(normalized)) return null;
  const select = {
    status: true,
    issuedAt: true,
    voidedAt: true,
    patient: { select: { firstName: true, lastName: true } },
    professional: { select: { honorific: true, firstName: true, lastName: true, licenseNumber: true, credentialsVerifiedAt: true } },
  } as const;
  const rx = await db.prescription.findUnique({ where: { verificationCode: normalized }, select });
  if (rx) return { kind: "Receta" as const, ...rx };
  const order = await db.studyOrder.findUnique({ where: { verificationCode: normalized }, select });
  if (order) return { kind: "Orden de estudios" as const, ...order };
  return null;
}

export { can };
