import { z } from "./zod-es";
import { checkbox, emptyToUndefined, intField, optionalText, requiredText } from "./common";

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const specialtySchema = z.object({
  name: requiredText(80, "Indica el nombre."),
  summary: requiredText(200, "Escribe una descripción breve."),
  description: optionalText(2000),
  imagePath: optionalText(300),
  imageAlt: optionalText(200),
  isPublished: checkbox,
  sortOrder: intField(0, 999),
});

export const serviceSchema = z.object({
  name: requiredText(100, "Indica el nombre."),
  summary: requiredText(200, "Escribe una descripción breve."),
  description: optionalText(2000),
  category: z.enum(["CONSULTATION", "EVALUATION", "IMAGING", "CARDIOLOGY_TEST", "LABORATORY", "FOLLOW_UP", "SURGERY", "OTHER"]),
  specialtyId: optionalText(64),
  durationMinutes: intField(5, 480, "Indica la duración en minutos."),
  price: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(/\./g, "").replace(/\s/g, ""))) : v),
    z.number({ error: "Ingresa el precio en guaraníes, sin decimales." }).int("Ingresa el precio sin decimales.").min(0).max(100_000_000).optional(),
  ),
  showPrice: checkbox,
  availabilityConfirmed: checkbox,
  isPublished: checkbox,
  bookableOnline: checkbox,
  capacityPerSlot: intField(1, 50),
  preparationNotes: optionalText(500),
  imagePath: optionalText(300),
  imageAlt: optionalText(200),
  sortOrder: intField(0, 999),
});

export const professionalSchema = z.object({
  honorific: optionalText(20),
  firstName: requiredText(60, "Indica el nombre."),
  lastName: requiredText(60, "Indica el apellido."),
  licenseNumber: optionalText(40),
  credentials: optionalText(2000),
  credentialsVerified: checkbox,
  bio: optionalText(2000),
  photoPath: optionalText(300),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  isPublished: checkbox,
  acceptsOnlineBooking: checkbox,
  agendaColor: z.preprocess(emptyToUndefined, z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").optional()),
  sortOrder: intField(0, 999),
  specialtyIds: z.array(z.string().max(64)).max(20).optional(),
  serviceIds: z.array(z.string().max(64)).max(50).optional(),
  userId: optionalText(64),
});

export const faqSchema = z.object({
  question: requiredText(200, "Escribe la pregunta."),
  answer: requiredText(2000, "Escribe la respuesta."),
  sortOrder: intField(0, 999),
  isPublished: checkbox,
});
