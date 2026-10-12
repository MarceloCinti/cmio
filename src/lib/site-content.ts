import { z } from "zod";

// Estructura del contenido editable del sitio institucional.
// Cada sección tiene borrador y versión publicada (ver SiteContent en Prisma).
// Los textos marcados como "provisional" deben ser revisados por la clínica.

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, por ejemplo #0E6E6B");
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const reqText = (max: number) => text(max).min(1, "Este campo es obligatorio");

export const FONT_PAIRS = {
  moderna: { label: "Moderna (Plus Jakarta Sans + Inter)", heading: "Plus Jakarta Sans Variable", body: "Inter Variable" },
  clasica: { label: "Clásica (Source Serif 4 + Inter)", heading: "Source Serif 4 Variable", body: "Inter Variable" },
  amable: { label: "Cercana (Figtree)", heading: "Figtree Variable", body: "Figtree Variable" },
} as const;
export type FontPairKey = keyof typeof FONT_PAIRS;

export const brandingSchema = z.object({
  logoPath: z.string().nullable(),
  logoAlt: text(120),
  primaryColor: hex,
  accentColor: hex,
  wellnessColor: hex,
  inkColor: hex,
  fontPair: z.enum(["moderna", "clasica", "amable"]),
});

const phoneSchema = z.object({ label: reqText(40), number: reqText(30) });

export const institutionSchema = z.object({
  name: reqText(120),
  shortName: reqText(20),
  tagline: text(160),
  city: reqText(60),
  country: reqText(60),
  address: reqText(200),
  addressReference: text(200),
  phones: z.array(phoneSchema).max(4),
  whatsappNumber: text(30),
  email: z.union([z.literal(""), z.string().trim().email("Correo electrónico inválido")]),
  hours: z.array(z.object({ days: reqText(60), hours: reqText(60) })).max(7),
  hoursNote: text(200),
  mapQuery: text(200),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  facebookUrl: z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s]+$/, "Usa un enlace que empiece con https://")]),
  instagramUrl: z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s]+$/, "Usa un enlace que empiece con https://")]),
  // El propietario confirma que teléfonos, dirección, horarios y WhatsApp fueron verificados.
  contactVerified: z.boolean(),
});

const blockSchema = z.object({
  key: z.string(),
  title: reqText(80),
  body: text(2000),
  visible: z.boolean(),
  provisional: z.boolean(),
});

export const landingSchema = z.object({
  hero: z.object({
    eyebrow: text(80),
    title: reqText(120),
    subtitle: text(300),
    primaryCta: reqText(40),
    secondaryCta: reqText(40),
    imagePath: reqText(300),
    imageAlt: reqText(200),
  }),
  about: z.object({
    title: reqText(80),
    intro: text(600),
    imagePath: text(300),
    imageAlt: text(200),
    blocks: z.array(blockSchema).max(10),
  }),
  specialties: z.object({ title: reqText(80), intro: text(400) }),
  services: z.object({ title: reqText(80), intro: text(400) }),
  professionals: z.object({ title: reqText(80), intro: text(400), emptyText: text(300) }),
  steps: z.object({
    title: reqText(80),
    intro: text(300),
    items: z.array(z.object({ title: reqText(80), body: text(300) })).min(1).max(8),
  }),
  faq: z.object({ title: reqText(80), intro: text(300) }),
  contact: z.object({ title: reqText(80), intro: text(300) }),
  ctaBand: z.object({ title: reqText(120), body: text(300), button: reqText(40), imagePath: text(300), imageAlt: text(200) }),
  seo: z.object({ title: reqText(70), description: reqText(170) }),
});

export const legalSchema = z.object({
  privacy: text(20000),
  terms: text(20000),
  dataTreatment: text(20000),
  // Mientras sea false, las páginas legales muestran un aviso de documento en revisión.
  reviewedByLegalCounsel: z.boolean(),
  policyVersion: reqText(20),
});

export const announcementSchema = z.object({
  enabled: z.boolean(),
  text: text(200),
  linkLabel: text(40),
  linkHref: z.union([z.literal(""), z.string().regex(/^(\/(?![\/\\])|https:\/\/)\S*$/, "Usa un enlace interno (/…) o https://")]),
});

export const SITE_CONTENT_SCHEMAS = {
  branding: brandingSchema,
  institution: institutionSchema,
  landing: landingSchema,
  legal: legalSchema,
  announcement: announcementSchema,
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_SCHEMAS;
export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_SCHEMAS) as SiteContentKey[];

export type Branding = z.infer<typeof brandingSchema>;
export type Institution = z.infer<typeof institutionSchema>;
export type Landing = z.infer<typeof landingSchema>;
export type Legal = z.infer<typeof legalSchema>;
export type Announcement = z.infer<typeof announcementSchema>;

export type SiteContentMap = {
  branding: Branding;
  institution: Institution;
  landing: Landing;
  legal: Legal;
  announcement: Announcement;
};

// ─────────────────────────────────────────────────────────────
// Valores iniciales
// ─────────────────────────────────────────────────────────────

export const DEFAULT_BRANDING: Branding = {
  logoPath: null,
  logoAlt: "CMIO — Centro de Manejo Integral de la Obesidad",
  primaryColor: "#0E6E6B",
  accentColor: "#B4532F",
  wellnessColor: "#5E9C7C",
  inkColor: "#12303A",
  fontPair: "moderna",
};

// Datos suministrados por la clínica como información inicial: deben verificarse.
export const DEFAULT_INSTITUTION: Institution = {
  name: "Centro de Manejo Integral de la Obesidad",
  shortName: "CMIO",
  tagline: "Atención médica multidisciplinaria en Capiatá",
  city: "Capiatá",
  country: "Paraguay",
  address: "Ruta PY02, frente al IPS",
  addressReference: "Clínica Periférica Campo Vía",
  phones: [
    { label: "Teléfono principal", number: "+595 974 824 111" },
    { label: "Teléfono alternativo", number: "+595 992 847 006" },
  ],
  whatsappNumber: "+595 974 824 111",
  email: "",
  hours: [{ days: "Lunes a viernes", hours: "09:00 a 19:00" }],
  hoursNote: "",
  mapQuery: "Clínica Periférica Campo Vía, Ruta PY02, Capiatá, Paraguay",
  latitude: null,
  longitude: null,
  facebookUrl: "",
  instagramUrl: "",
  contactVerified: false,
};

export const DEFAULT_LANDING: Landing = {
  hero: {
    eyebrow: "Centro de Manejo Integral de la Obesidad · Capiatá",
    title: "Un enfoque integral para cuidar tu salud y bienestar.",
    subtitle:
      "Atención médica multidisciplinaria para acompañarte en el cuidado de tu peso, tu salud metabólica y tu calidad de vida.",
    primaryCta: "Agendar una consulta",
    secondaryCta: "Conocer nuestros servicios",
    imagePath: "/images/consulta-medica.jpg",
    imageAlt: "Médica sonriente conversando con un paciente en un consultorio luminoso",
  },
  about: {
    title: "La clínica",
    intro:
      "En el CMIO trabajamos con un enfoque integral: el cuidado del peso y de la salud metabólica involucra a distintas especialidades que se coordinan alrededor de cada paciente.",
    imagePath: "/images/equipo-multidisciplinario.jpg",
    imageAlt: "Dos profesionales de la salud conversan con dos pacientes en un consultorio moderno",
    blocks: [
      {
        key: "presentacion",
        title: "Presentación",
        body:
          "El Centro de Manejo Integral de la Obesidad reúne en un mismo lugar consultas de nutrición, clínica médica, endocrinología, cardiología y cirugía bariátrica y metabólica, para que cada persona reciba una evaluación completa y un seguimiento ordenado.",
        visible: true,
        provisional: true,
      },
      {
        key: "mision",
        title: "Misión",
        body:
          "Acompañar a cada paciente en el cuidado de su peso y de su salud metabólica con atención médica respetuosa, basada en evidencia y coordinada entre especialidades.",
        visible: true,
        provisional: true,
      },
      {
        key: "vision",
        title: "Visión",
        body:
          "Ser un centro de referencia en Capiatá para el abordaje integral de la obesidad y sus enfermedades asociadas.",
        visible: true,
        provisional: true,
      },
      {
        key: "valores",
        title: "Valores",
        body: "Respeto y trato humano · Confidencialidad · Trabajo en equipo · Responsabilidad profesional · Mejora continua",
        visible: true,
        provisional: true,
      },
      {
        key: "metodologia",
        title: "Metodología de atención",
        body:
          "Cada proceso comienza con una evaluación inicial. A partir de ella, el equipo define junto al paciente un plan de atención y los controles de seguimiento que correspondan, con registro ordenado de cada consulta.",
        visible: true,
        provisional: true,
      },
      {
        key: "instalaciones",
        title: "Instalaciones",
        body:
          "Atendemos en Ruta PY02, frente al IPS, en la Clínica Periférica Campo Vía (Capiatá). Próximamente compartiremos más información sobre nuestras instalaciones.",
        visible: false,
        provisional: true,
      },
    ],
  },
  specialties: {
    title: "Especialidades",
    intro: "Un equipo multidisciplinario para abordar el peso y la salud metabólica desde todos los frentes necesarios.",
  },
  services: {
    title: "Servicios y estudios",
    intro: "Consultas, evaluaciones y estudios disponibles en la clínica. Consulta con la secretaría por requisitos de preparación.",
  },
  professionals: {
    title: "Profesionales",
    intro: "Conoce al equipo que te acompañará en cada etapa de tu atención.",
    emptyText:
      "Muy pronto publicaremos los perfiles de nuestro equipo de profesionales. Mientras tanto, puedes solicitar una cita y la secretaría te orientará.",
  },
  steps: {
    title: "Cómo funciona la atención",
    intro: "Un proceso sencillo, pensado para que sepas en todo momento cuál es el siguiente paso.",
    items: [
      { title: "Solicita una cita", body: "Desde el portal del paciente, por teléfono o por WhatsApp." },
      { title: "Confirma tus datos y el horario", body: "Verifica tus datos personales y el horario elegido." },
      { title: "Acude a tu consulta", body: "Llega unos minutos antes para registrar tu llegada en recepción." },
      {
        title: "Recibe el acompañamiento profesional que corresponda",
        body: "El profesional evaluará tu situación y te indicará los pasos a seguir.",
      },
      {
        title: "Continúa tu seguimiento",
        body: "Agenda tus controles según las indicaciones del equipo médico.",
      },
    ],
  },
  faq: { title: "Preguntas frecuentes", intro: "Respuestas a las consultas más habituales." },
  contact: { title: "Ubicación y contacto", intro: "Estamos en Capiatá. Escríbenos o llámanos para coordinar tu atención." },
  ctaBand: {
    title: "¿Quieres dar el primer paso?",
    body: "Solicita tu cita en línea o comunícate con la secretaría. Te ayudaremos a elegir la consulta adecuada.",
    button: "Solicitar una cita",
    imagePath: "/images/alimentacion-saludable.jpg",
    imageAlt: "Verduras, frutas frescas y un libro de recetas sobre una mesa",
  },
  seo: {
    title: "CMIO Capiatá — Centro de Manejo Integral de la Obesidad",
    description:
      "Atención médica multidisciplinaria en Capiatá: nutrición, clínica médica, endocrinología, cardiología y cirugía bariátrica y metabólica. Solicita tu cita en línea.",
  },
};

export const DEFAULT_LEGAL: Legal = {
  policyVersion: "2026-10-borrador",
  reviewedByLegalCounsel: false,
  privacy: `## Responsable del tratamiento
El Centro de Manejo Integral de la Obesidad (CMIO), con domicilio en Ruta PY02, frente al IPS, Clínica Periférica Campo Vía, Capiatá, Paraguay, es responsable del tratamiento de los datos personales recopilados a través de este sitio y del portal del paciente.

## Datos que recopilamos
- Datos de identificación y contacto: nombre, documento de identidad, fecha de nacimiento, teléfono y correo electrónico.
- Datos de uso del portal: citas solicitadas, confirmaciones y cancelaciones.
- Datos de salud: únicamente los registrados por profesionales de la salud en el marco de la atención, con acceso restringido.

## Finalidades
- Gestionar solicitudes de cita, recordatorios y la atención en la clínica.
- Mantener la historia clínica conforme a las normas sanitarias aplicables.
- Comunicarnos contigo por los canales que autorices (correo electrónico o WhatsApp).

## Confidencialidad y seguridad
El acceso a la información está limitado según el rol de cada usuario. Los accesos a la historia clínica quedan registrados. Los documentos clínicos no se publican mediante enlaces públicos.

## Tus derechos
Puedes solicitar el acceso, la rectificación o la actualización de tus datos, así como retirar tu consentimiento para comunicaciones, contactando con la secretaría de la clínica.

## Conservación
Los datos clínicos se conservan durante los plazos exigidos por la normativa sanitaria. Los datos de contacto se conservan mientras exista una relación de atención o hasta que solicites su eliminación, cuando corresponda.`,
  terms: `## Uso del sitio
Este sitio brinda información institucional y permite solicitar citas. La información publicada no reemplaza una consulta médica.

## Cuentas de usuario
Cada persona es responsable de mantener la confidencialidad de su contraseña. Las cuentas de pacientes son personales.

## Citas
Las citas están sujetas a disponibilidad y a las políticas de cancelación y reprogramación vigentes, informadas al momento de reservar.

## Emergencias
Este sitio no está destinado a la atención de emergencias. Ante una urgencia, acude al servicio de emergencias más cercano.`,
  dataTreatment: `Al registrarte o enviar un formulario aceptas que el CMIO trate tus datos personales para gestionar tu atención y comunicarse contigo sobre tus citas. No compartimos tus datos con terceros con fines publicitarios. Los mensajes de recordatorio no incluyen información sobre diagnósticos ni tratamientos. Puedes retirar tu consentimiento para recibir comunicaciones en cualquier momento desde tu perfil o contactando con la secretaría.`,
};

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  text: "",
  linkLabel: "",
  linkHref: "",
};

export const DEFAULT_SITE_CONTENT: SiteContentMap = {
  branding: DEFAULT_BRANDING,
  institution: DEFAULT_INSTITUTION,
  landing: DEFAULT_LANDING,
  legal: DEFAULT_LEGAL,
  announcement: DEFAULT_ANNOUNCEMENT,
};

/** Normaliza un número paraguayo a formato internacional sin símbolos (para tel: y wa.me). */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, "");
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `595${d.slice(1)}`;
  if (!/^\d{8,15}$/.test(d)) return null;
  return d;
}

export function telHref(value: string) {
  const n = normalizePhone(value);
  return n ? `tel:+${n}` : null;
}

export function whatsappHref(value: string, message?: string) {
  const n = normalizePhone(value);
  if (!n) return null;
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
