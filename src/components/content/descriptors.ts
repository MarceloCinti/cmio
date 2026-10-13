import type { FieldDesc } from "./object-editor";
import { FONT_PAIRS } from "@/lib/site-content";

export const INSTITUTION_FIELDS: FieldDesc[] = [
  { key: "contactVerified", label: "Confirmo que los teléfonos, la dirección, los horarios y el número de WhatsApp fueron verificados", type: "checkbox", hint: "Mientras no esté marcado, el panel muestra este punto como pendiente y los datos estructurados para buscadores no incluyen el teléfono." },
  { key: "name", label: "Nombre de la institución", type: "text" },
  { key: "shortName", label: "Sigla", type: "text" },
  { key: "tagline", label: "Frase breve", type: "text" },
  { key: "address", label: "Dirección", type: "text" },
  { key: "addressReference", label: "Referencia", type: "text" },
  { key: "city", label: "Ciudad", type: "text" },
  { key: "country", label: "País", type: "text" },
  {
    key: "phones",
    label: "Teléfonos",
    type: "list",
    itemLabel: "Teléfono",
    maxItems: 4,
    newItem: { label: "Teléfono", number: "" },
    fields: [
      { key: "label", label: "Etiqueta", type: "text" },
      { key: "number", label: "Número (con código de país)", type: "text", hint: "Ejemplo: +595 981 123 456" },
    ],
  },
  { key: "whatsappNumber", label: "Número de WhatsApp", type: "text", hint: "Se usa para generar el enlace wa.me. Verifica que el número tenga WhatsApp activo." },
  { key: "email", label: "Correo de contacto", type: "text" },
  {
    key: "hours",
    label: "Horarios de atención",
    type: "list",
    itemLabel: "Horario",
    maxItems: 7,
    newItem: { days: "", hours: "" },
    fields: [
      { key: "days", label: "Días", type: "text" },
      { key: "hours", label: "Horario", type: "text" },
    ],
  },
  { key: "hoursNote", label: "Nota sobre horarios", type: "text" },
  { key: "mapQuery", label: "Búsqueda para el mapa", type: "text", hint: "Texto que se busca en el mapa si no hay coordenadas verificadas." },
  { key: "latitude", label: "Latitud (opcional, solo si está verificada)", type: "number" },
  { key: "longitude", label: "Longitud (opcional, solo si está verificada)", type: "number" },
  { key: "facebookUrl", label: "Facebook (enlace)", type: "text" },
  { key: "instagramUrl", label: "Instagram (enlace)", type: "text" },
];

export const BRANDING_FIELDS: FieldDesc[] = [
  { key: "logoPath", label: "Logotipo", type: "image", hint: "Si no cargas un logotipo, se usa el isotipo de CMIO." },
  { key: "logoAlt", label: "Texto alternativo del logotipo", type: "text" },
  { key: "primaryColor", label: "Color institucional", type: "color" },
  { key: "accentColor", label: "Color de acento (botones principales)", type: "color" },
  { key: "wellnessColor", label: "Color de bienestar", type: "color" },
  { key: "inkColor", label: "Color de textos", type: "color" },
  { key: "fontPair", label: "Tipografías", type: "select", options: Object.entries(FONT_PAIRS).map(([value, f]) => ({ value, label: f.label })) },
];

export const LANDING_FIELDS: FieldDesc[] = [
  {
    key: "hero",
    label: "Sección principal",
    type: "group",
    fields: [
      { key: "eyebrow", label: "Texto superior", type: "text" },
      { key: "title", label: "Título", type: "text" },
      { key: "subtitle", label: "Subtítulo", type: "textarea", rows: 3 },
      { key: "primaryCta", label: "Botón principal", type: "text" },
      { key: "secondaryCta", label: "Botón secundario", type: "text" },
      { key: "imagePath", label: "Imagen principal", type: "image", altKey: "imageAlt" },
      { key: "imageAlt", label: "Descripción de la imagen (texto alternativo)", type: "text" },
      { key: "imageCaption", label: "Leyenda sobre la foto (opcional, p. ej. nombre del profesional)", type: "text" },
    ],
  },
  {
    key: "about",
    label: "La clínica",
    type: "group",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "intro", label: "Introducción", type: "textarea", rows: 3 },
      { key: "imagePath", label: "Imagen", type: "image", altKey: "imageAlt" },
      { key: "imageAlt", label: "Descripción de la imagen", type: "text" },
      {
        key: "blocks",
        label: "Bloques (presentación, misión, visión, valores, metodología, instalaciones)",
        type: "list",
        itemLabel: "Bloque",
        maxItems: 10,
        newItem: { key: "bloque", title: "", body: "", visible: true, provisional: true },
        fields: [
          { key: "title", label: "Título", type: "text" },
          { key: "body", label: "Texto", type: "textarea", rows: 3, hint: "En «Valores», separa cada valor con «·»." },
          { key: "visible", label: "Visible en el sitio", type: "checkbox" },
          { key: "provisional", label: "Texto provisional (pendiente de revisión por la clínica)", type: "checkbox" },
        ],
      },
    ],
  },
  { key: "specialties", label: "Especialidades", type: "group", fields: [{ key: "title", label: "Título", type: "text" }, { key: "intro", label: "Introducción", type: "textarea", rows: 2 }] },
  { key: "services", label: "Servicios", type: "group", fields: [{ key: "title", label: "Título", type: "text" }, { key: "intro", label: "Introducción", type: "textarea", rows: 2 }] },
  {
    key: "professionals",
    label: "Profesionales",
    type: "group",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "intro", label: "Introducción", type: "textarea", rows: 2 },
      { key: "emptyText", label: "Texto cuando no hay perfiles publicados", type: "textarea", rows: 2 },
    ],
  },
  {
    key: "steps",
    label: "Cómo funciona la atención",
    type: "group",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "intro", label: "Introducción", type: "textarea", rows: 2 },
      { key: "items", label: "Pasos", type: "list", itemLabel: "Paso", maxItems: 8, newItem: { title: "", body: "" }, fields: [{ key: "title", label: "Título", type: "text" }, { key: "body", label: "Texto", type: "textarea", rows: 2 }] },
    ],
  },
  { key: "faq", label: "Preguntas frecuentes (encabezado)", type: "group", fields: [{ key: "title", label: "Título", type: "text" }, { key: "intro", label: "Introducción", type: "textarea", rows: 2 }] },
  { key: "contact", label: "Contacto (encabezado)", type: "group", fields: [{ key: "title", label: "Título", type: "text" }, { key: "intro", label: "Introducción", type: "textarea", rows: 2 }] },
  {
    key: "ctaBand",
    label: "Llamado a la acción",
    type: "group",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "body", label: "Texto", type: "textarea", rows: 2 },
      { key: "button", label: "Botón", type: "text" },
      { key: "imagePath", label: "Imagen de fondo", type: "image", altKey: "imageAlt" },
      { key: "imageAlt", label: "Descripción de la imagen", type: "text" },
    ],
  },
  {
    key: "seo",
    label: "Buscadores (SEO)",
    type: "group",
    fields: [
      { key: "title", label: "Título para buscadores (máx. 70)", type: "text" },
      { key: "description", label: "Descripción para buscadores (máx. 170)", type: "textarea", rows: 2 },
    ],
  },
];

export const LEGAL_FIELDS: FieldDesc[] = [
  { key: "reviewedByLegalCounsel", label: "Los textos fueron revisados por asesoría legal", type: "checkbox", hint: "Mientras no esté marcado, las páginas legales muestran el aviso «Documento en revisión»." },
  { key: "policyVersion", label: "Versión de la política", type: "text", hint: "Se registra junto con cada consentimiento." },
  { key: "privacy", label: "Política de privacidad", type: "textarea", rows: 14, hint: "Formato: «## Título» para subtítulos y «- » para listas." },
  { key: "terms", label: "Términos de uso", type: "textarea", rows: 10 },
  { key: "dataTreatment", label: "Aviso de tratamiento de datos", type: "textarea", rows: 6 },
];

export const ANNOUNCEMENT_FIELDS: FieldDesc[] = [
  { key: "enabled", label: "Mostrar aviso en el sitio", type: "checkbox" },
  { key: "text", label: "Texto del aviso", type: "text" },
  { key: "linkLabel", label: "Texto del enlace", type: "text" },
  { key: "linkHref", label: "Enlace", type: "text", hint: "Interno (por ejemplo, /contacto) o https://…" },
];
