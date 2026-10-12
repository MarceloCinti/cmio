import { z } from "zod";

// Parámetros operativos. Se guardan separados del contenido del sitio para que un
// cambio de textos nunca altere reglas de agenda ni de notificaciones.

export const bookingPolicySchema = z.object({
  // Anticipación mínima para reservar en línea (horas).
  minLeadHours: z.coerce.number().int().min(0).max(168),
  // Ventana máxima de reserva (días hacia adelante).
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
  // El paciente puede cancelar en línea hasta N horas antes.
  patientCancelMinHours: z.coerce.number().int().min(0).max(168),
  allowPatientReschedule: z.boolean(),
  patientRescheduleMinHours: z.coerce.number().int().min(0).max(168),
  // Máximo de citas futuras activas por paciente desde el portal.
  maxActiveAppointmentsPerPatient: z.coerce.number().int().min(1).max(20),
  // El paciente puede confirmar asistencia desde N horas antes.
  confirmWindowHours: z.coerce.number().int().min(1).max(336),
  cancellationPolicyText: z.string().trim().max(600),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  notifyStaffOnPortalBooking: z.boolean(),
});

export const modulesSchema = z.object({
  payments: z.boolean(),
});

export type BookingPolicy = z.infer<typeof bookingPolicySchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type ModulesSettings = z.infer<typeof modulesSchema>;

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  minLeadHours: 2,
  maxDaysAhead: 60,
  patientCancelMinHours: 24,
  allowPatientReschedule: true,
  patientRescheduleMinHours: 24,
  maxActiveAppointmentsPerPatient: 3,
  confirmWindowHours: 72,
  cancellationPolicyText:
    "Puedes cancelar o reprogramar tu cita desde el portal hasta 24 horas antes. Pasado ese plazo, comunícate con la secretaría.",
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  whatsappEnabled: false,
  reminderHoursBefore: 24,
  notifyStaffOnPortalBooking: true,
};

export const DEFAULT_MODULES: ModulesSettings = { payments: false };

export const SYSTEM_SETTING_DEFAULTS = {
  booking: DEFAULT_BOOKING_POLICY,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  modules: DEFAULT_MODULES,
} as const;

export const SYSTEM_SETTING_SCHEMAS = {
  booking: bookingPolicySchema,
  notifications: notificationSettingsSchema,
  modules: modulesSchema,
} as const;

export type SystemSettingKey = keyof typeof SYSTEM_SETTING_DEFAULTS;
