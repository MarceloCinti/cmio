import { z } from "./zod-es";
import {
  birthDateField,
  checkbox,
  documentNumberField,
  emailField,
  emptyToUndefined,
  optionalIsoDate,
  optionalPhoneField,
  optionalText,
  personName,
  phoneField,
} from "./common";

export const patientAdminSchema = z.object({
  firstName: personName("el nombre"),
  lastName: personName("el apellido"),
  documentType: z.enum(["CI", "PASSPORT", "OTHER"], { error: "Selecciona el tipo de documento." }),
  documentNumber: z.preprocess(emptyToUndefined, documentNumberField.optional()),
  birthDate: z.preprocess(emptyToUndefined, birthDateField.optional()),
  sex: z.preprocess(emptyToUndefined, z.enum(["FEMALE", "MALE", "OTHER", "UNDISCLOSED"]).optional()),
  phone: phoneField,
  email: z.preprocess(emptyToUndefined, emailField.optional()),
  city: optionalText(80),
  address: optionalText(200),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalPhoneField,
  insuranceProvider: optionalText(120),
  adminNotes: optionalText(1000),
});

// Datos que el paciente puede actualizar por sí mismo. Los datos de identidad
// (nombre, documento, fecha de nacimiento) se corrigen en secretaría.
export const patientSelfSchema = z.object({
  phone: phoneField,
  city: optionalText(80),
  address: optionalText(200),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalPhoneField,
  insuranceProvider: optionalText(120),
});

export const consentPrefsSchema = z.object({
  emailOptIn: checkbox,
  whatsappOptIn: checkbox,
});

export const patientSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
});

export { optionalIsoDate };
export type PatientAdminInput = z.infer<typeof patientAdminSchema>;
