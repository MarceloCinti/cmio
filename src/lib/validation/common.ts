import { z } from "./zod-es";
import { isValidISODate } from "@/lib/time";

export const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const emailField = z
  .string({ error: "Ingresa tu correo electrónico." })
  .trim()
  .toLowerCase()
  .min(1, "Ingresa tu correo electrónico.")
  .max(160, "El correo es demasiado largo.")
  .email("Ingresa un correo electrónico válido.");

const COMMON_PASSWORDS = new Set([
  "1234567890",
  "12345678910",
  "contraseña1",
  "contrasena1",
  "password123",
  "qwertyuiop",
  "paraguay123",
  "cmio123456",
  "0987654321",
  "1111111111",
]);

export const passwordField = z
  .string({ error: "Ingresa una contraseña." })
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(128, "La contraseña debe tener como máximo 128 caracteres.")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "Esa contraseña es demasiado común. Elige otra.")
  .refine((v) => new Set(v).size >= 4, "La contraseña es demasiado simple. Combina letras, números o símbolos.");

export const personName = (label: string) =>
  z
    .string({ error: `Ingresa ${label}.` })
    .trim()
    .min(2, `Ingresa ${label}.`)
    .max(80, `${label[0].toUpperCase()}${label.slice(1)} es demasiado largo.`)
    .regex(/^[\p{L}\p{M}' .-]+$/u, `Revisa ${label}: solo se admiten letras, espacios, apóstrofos y guiones.`);

export const phoneField = z
  .string({ error: "Ingresa un número de teléfono." })
  .trim()
  .min(6, "Ingresa un número de teléfono válido.")
  .max(25, "El número de teléfono es demasiado largo.")
  .regex(/^[+\d][\d\s()-]{5,24}$/, "Ingresa un número de teléfono válido, por ejemplo 0981 123 456.");

export const optionalPhoneField = z.preprocess(emptyToUndefined, phoneField.optional());

export const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Debe tener como máximo ${max} caracteres.`).optional());

export const requiredText = (max: number, message = "Este campo es obligatorio.") =>
  z.string({ error: message }).trim().min(1, message).max(max, `Debe tener como máximo ${max} caracteres.`);

export const isoDateField = z
  .string({ error: "Selecciona una fecha." })
  .trim()
  .refine((v) => isValidISODate(v), "Selecciona una fecha válida.");

export const optionalIsoDate = z.preprocess(emptyToUndefined, isoDateField.optional());

export const birthDateField = isoDateField.refine((v) => {
  const year = Number(v.slice(0, 4));
  const today = new Date().toISOString().slice(0, 10);
  return year >= 1900 && v <= today;
}, "Ingresa una fecha de nacimiento válida.");

export const documentNumberField = z
  .string()
  .trim()
  .max(20, "El número de documento es demasiado largo.")
  .regex(/^[0-9A-Za-z.-]*$/, "El documento solo puede contener números, letras, puntos o guiones.")
  .transform((v) => v.replace(/[.\s]/g, "").toUpperCase());

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const idField = z.string().trim().min(1, "Falta un identificador.").max(64);

export const intField = (min: number, max: number, message = "Ingresa un número válido.") =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v),
    z.number({ error: message }).int(message).min(min, `El valor mínimo es ${min}.`).max(max, `El valor máximo es ${max}.`),
  );

export const optionalDecimal = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(",", "."))) : v),
    z
      .number({ error: `Ingresa un valor numérico para ${label}.` })
      .min(min, `${label}: el valor mínimo es ${min}.`)
      .max(max, `${label}: el valor máximo es ${max}.`)
      .optional(),
  );

export const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v),
    z
      .number({ error: `Ingresa un número entero para ${label}.` })
      .int(`Ingresa un número entero para ${label}.`)
      .min(min, `${label}: el valor mínimo es ${min}.`)
      .max(max, `${label}: el valor máximo es ${max}.`)
      .optional(),
  );
