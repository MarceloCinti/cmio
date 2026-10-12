import { z } from "./zod-es";
import { checkbox, optionalDecimal, optionalInt, optionalIsoDate, optionalText, requiredText } from "./common";

export const backgroundSchema = z.object({
  allergies: optionalText(2000),
  currentMedications: optionalText(2000),
  personalHistory: optionalText(4000),
  familyHistory: optionalText(2000),
  surgicalHistory: optionalText(2000),
  habits: optionalText(2000),
  notes: optionalText(2000),
});

export const encounterSchema = z.object({
  reason: requiredText(500, "Indica el motivo de consulta."),
  currentIllness: optionalText(6000),
  physicalExam: optionalText(6000),
  assessment: optionalText(6000),
  plan: optionalText(6000),
  followUpInstructions: optionalText(3000),
  patientInstructions: optionalText(3000),
  sharePatientInstructions: checkbox,
  clinicalNotes: optionalText(6000),
  nextEvaluationDate: optionalIsoDate,
});

export const vitalsSchema = z.object({
  weightKg: optionalDecimal(20, 400, "Peso"),
  heightCm: optionalDecimal(80, 250, "Talla"),
  waistCm: optionalDecimal(30, 300, "Cintura"),
  hipCm: optionalDecimal(30, 300, "Cadera"),
  bodyFatPct: optionalDecimal(1, 80, "Grasa corporal"),
  systolic: optionalInt(50, 300, "Presión sistólica"),
  diastolic: optionalInt(20, 200, "Presión diastólica"),
  heartRate: optionalInt(20, 250, "Frecuencia cardíaca"),
  respiratoryRate: optionalInt(4, 80, "Frecuencia respiratoria"),
  temperatureC: optionalDecimal(30, 45, "Temperatura"),
  spo2: optionalInt(50, 100, "Saturación de oxígeno"),
});

export const diagnosisSchema = z.object({
  code: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .toUpperCase()
      .max(10, "El código es demasiado largo.")
      .regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/, "Usa un código CIE-10 válido, por ejemplo E66.9.")
      .optional(),
  ),
  description: requiredText(300, "Describe el diagnóstico."),
  kind: z.enum(["PRINCIPAL", "SECONDARY"]),
  certainty: z.enum(["PRESUMPTIVE", "CONFIRMED"]),
});

export const prescriptionItemSchema = z.object({
  medication: requiredText(200, "Indica el medicamento."),
  dose: optionalText(100),
  frequency: optionalText(100),
  duration: optionalText(100),
  quantity: optionalText(60),
  instructions: optionalText(300),
});

export const studyOrderSchema = z.object({
  studies: z
    .string({ error: "Indica al menos un estudio." })
    .trim()
    .min(2, "Indica al menos un estudio.")
    .max(2000)
    .transform((v) =>
      v
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  indication: optionalText(500),
  isUrgent: checkbox,
});

export const addendumSchema = z.object({
  content: requiredText(4000, "Escribe el contenido de la adenda."),
  reason: optionalText(300),
});

export const goalSchema = z.object({
  description: requiredText(300, "Describe el objetivo."),
  metric: z.enum(["WEIGHT", "WAIST", "BMI", "OTHER"]),
  targetValue: optionalDecimal(1, 500, "Valor objetivo"),
  targetDate: optionalIsoDate,
  visibleToPatient: checkbox,
});

export const documentUploadSchema = z.object({
  title: requiredText(150, "Indica un título para el documento."),
  category: z.enum(["LAB_RESULT", "IMAGING_REPORT", "MEDICAL_REPORT", "PRESCRIPTION", "STUDY_ORDER", "OTHER"], { error: "Selecciona la categoría." }),
  description: optionalText(500),
  encounterId: optionalText(64),
  publishNow: checkbox,
});

export const exportSchema = z.object({
  reason: requiredText(300, "Indica el motivo de la exportación (por ejemplo, solicitud del paciente o requerimiento legal)."),
});

export function computeBmi(weightKg?: number, heightCm?: number) {
  if (!weightKg || !heightCm) return undefined;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
