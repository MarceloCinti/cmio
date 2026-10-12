import { z } from "./zod-es";
import {
  birthDateField,
  checkbox,
  documentNumberField,
  emailField,
  passwordField,
  personName,
  phoneField,
} from "./common";

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: "Ingresa tu contraseña." }).min(1, "Ingresa tu contraseña.").max(200),
  siguiente: z.string().max(300).optional(),
});

export const registerStep1Schema = z.object({
  firstName: personName("tu nombre"),
  lastName: personName("tu apellido"),
  documentType: z.enum(["CI", "PASSPORT", "OTHER"], { error: "Selecciona el tipo de documento." }),
  documentNumber: documentNumberField.refine((v) => v.length >= 3, "Ingresa tu número de documento."),
  birthDate: birthDateField,
  phone: phoneField,
});

export const registerStep2Base = z.object({
  email: emailField,
  password: passwordField,
  passwordConfirm: z.string({ error: "Repite la contraseña." }).min(1, "Repite la contraseña."),
  acceptTerms: z.preprocess(
    (v) => v === "on" || v === "true",
    z.literal(true, { error: "Debes aceptar los términos y el aviso de tratamiento de datos." }),
  ),
  emailOptIn: checkbox,
  whatsappOptIn: checkbox,
  siguiente: z.string().max(300).optional(),
});

const passwordsMatch = (d: { password: string; passwordConfirm: string }) => d.password === d.passwordConfirm;
const mismatch = { message: "Las contraseñas no coinciden.", path: ["passwordConfirm"] };

export const registerStep2Schema = registerStep2Base.refine(passwordsMatch, mismatch);

export const registerSchema = registerStep1Schema.extend(registerStep2Base.shape).refine(passwordsMatch, mismatch);

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "El enlace no es válido.").max(200),
    password: passwordField,
    passwordConfirm: z.string({ error: "Repite la contraseña." }).min(1, "Repite la contraseña."),
  })
  .refine(passwordsMatch, mismatch);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Ingresa tu contraseña actual." }).min(1, "Ingresa tu contraseña actual."),
    password: passwordField,
    passwordConfirm: z.string({ error: "Repite la contraseña." }).min(1, "Repite la contraseña."),
  })
  .refine(passwordsMatch, mismatch)
  .refine((d) => d.currentPassword !== d.password, {
    message: "La nueva contraseña debe ser distinta de la actual.",
    path: ["password"],
  });

export const tokenSchema = z.object({ token: z.string().min(10, "El enlace no es válido.").max(200) });

export type RegisterInput = z.infer<typeof registerSchema>;
