// Etiquetas en español para los valores de enumeraciones de la base de datos.
import type { BadgeTone } from "@/components/ui/badge";

export const SERVICE_CATEGORY_LABELS = {
  CONSULTATION: "Consulta",
  EVALUATION: "Evaluación",
  IMAGING: "Imágenes",
  CARDIOLOGY_TEST: "Estudio cardiológico",
  LABORATORY: "Laboratorio",
  FOLLOW_UP: "Seguimiento",
  SURGERY: "Cirugía",
  OTHER: "Otro",
} as const;

export type AppointmentStatusKey =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatusKey, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "En espera",
  IN_PROGRESS: "En atención",
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
  NO_SHOW: "Ausente",
};

export const APPOINTMENT_STATUS_TONES: Record<AppointmentStatusKey, BadgeTone> = {
  SCHEDULED: "info",
  CONFIRMED: "primary",
  CHECKED_IN: "warning",
  IN_PROGRESS: "violet",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

// Colores discretos para la agenda (borde izquierdo de cada cita).
export const APPOINTMENT_STATUS_BAR: Record<AppointmentStatusKey, string> = {
  SCHEDULED: "border-l-sky-500",
  CONFIRMED: "border-l-teal-600",
  CHECKED_IN: "border-l-amber-500",
  IN_PROGRESS: "border-l-violet-500",
  COMPLETED: "border-l-emerald-600",
  CANCELLED: "border-l-slate-300",
  NO_SHOW: "border-l-red-500",
};

export const DOCUMENT_TYPE_LABELS = { CI: "Cédula de identidad", PASSPORT: "Pasaporte", OTHER: "Otro documento" } as const;

export const SEX_LABELS = { FEMALE: "Femenino", MALE: "Masculino", OTHER: "Otro", UNDISCLOSED: "Prefiere no informar" } as const;

export const EXCEPTION_KIND_LABELS = {
  HOLIDAY: "Feriado",
  CLOSURE: "Cierre de la clínica",
  VACATION: "Vacaciones",
  ABSENCE: "Ausencia",
  BLOCK: "Bloqueo de agenda",
} as const;

export const DOCUMENT_CATEGORY_LABELS = {
  LAB_RESULT: "Resultado de laboratorio",
  IMAGING_REPORT: "Informe de estudio por imágenes",
  MEDICAL_REPORT: "Informe médico",
  PRESCRIPTION: "Receta",
  STUDY_ORDER: "Orden de estudios",
  OTHER: "Otro documento",
} as const;

export const DOCUMENT_STATUS_LABELS = {
  PENDING_REVIEW: "Pendiente de revisión",
  PUBLISHED: "Publicado para el paciente",
  WITHDRAWN: "Retirado",
} as const;

export const CONTACT_STATUS_LABELS = {
  NEW: "Nueva",
  IN_PROGRESS: "En gestión",
  RESOLVED: "Resuelta",
  DISCARDED: "Descartada",
} as const;

export const CONTACT_KIND_LABELS = { APPOINTMENT: "Solicitud de cita", GENERAL: "Consulta general" } as const;

export const PROFESSIONAL_STATUS_LABELS = { DRAFT: "Perfil pendiente", ACTIVE: "Activo", INACTIVE: "Inactivo" } as const;

export const USER_STATUS_LABELS = {
  PENDING_VERIFICATION: "Pendiente de verificación",
  INVITED: "Invitación enviada",
  ACTIVE: "Activo",
  DISABLED: "Desactivado",
} as const;

export const MESSAGE_STATUS_LABELS = { PENDING: "En cola", SENT: "Enviado", FAILED: "Fallido", SKIPPED: "No enviado" } as const;

export const MESSAGE_SKIP_REASONS: Record<string, string> = {
  NO_CONFIGURADO: "Integración no configurada",
  CANAL_DESACTIVADO: "Canal desactivado en la configuración",
  SIN_CONSENTIMIENTO: "Sin consentimiento del paciente",
  SIN_DESTINATARIO: "Sin dato de contacto",
  TELEFONO_INVALIDO: "Número de teléfono inválido",
  SIN_PLANTILLA: "Plantilla inactiva o inexistente",
};

/** Estados informados por el webhook de WhatsApp Cloud API. */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  sent: "aceptado",
  delivered: "entregado",
  read: "leído",
  failed: "no entregado",
};

export const ENCOUNTER_STATUS_LABELS = { DRAFT: "Borrador", FINALIZED: "Finalizada" } as const;

export const DIAGNOSIS_KIND_LABELS = { PRINCIPAL: "Principal", SECONDARY: "Secundario" } as const;
export const DIAGNOSIS_CERTAINTY_LABELS = { PRESUMPTIVE: "Presuntivo", CONFIRMED: "Confirmado" } as const;
export const ORDER_STATUS_LABELS = { DRAFT: "Borrador", ISSUED: "Emitida", VOIDED: "Anulada" } as const;
export const GOAL_METRIC_LABELS = { WEIGHT: "Peso (kg)", WAIST: "Circunferencia de cintura (cm)", BMI: "IMC", OTHER: "Otro" } as const;
export const GOAL_STATUS_LABELS = { ACTIVE: "En curso", ACHIEVED: "Alcanzado", DISCONTINUED: "Suspendido" } as const;
