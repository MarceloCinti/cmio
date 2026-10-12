import { z } from "./zod-es";
import { emailField, emptyToUndefined, optionalText, personName, phoneField } from "./common";

export const contactFormSchema = z.object({
  fullName: personName("tu nombre"),
  phone: phoneField,
  email: z.preprocess(emptyToUndefined, emailField.optional()),
  message: z
    .string({ error: "Escribe tu consulta." })
    .trim()
    .min(5, "Escribe tu consulta (al menos 5 caracteres).")
    .max(1000, "El mensaje debe tener como máximo 1000 caracteres."),
  consent: z.preprocess((v) => v === "on" || v === "true", z.literal(true, { error: "Debes aceptar el aviso de tratamiento de datos para enviar el formulario." })),
  // Campo trampa para bots: debe quedar vacío.
  website: z.string().max(200).optional(),
});

export const appointmentRequestSchema = z.object({
  fullName: personName("tu nombre"),
  phone: phoneField,
  email: z.preprocess(emptyToUndefined, emailField.optional()),
  specialtyId: optionalText(64),
  preferredSchedule: optionalText(200),
  message: optionalText(600),
  consent: z.preprocess((v) => v === "on" || v === "true", z.literal(true, { error: "Debes aceptar el aviso de tratamiento de datos para enviar la solicitud." })),
  website: z.string().max(200).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
