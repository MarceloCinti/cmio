// Plantillas predeterminadas de mensajes. Nunca incluyen diagnósticos, tratamientos
// ni resultados: solo datos administrativos de la cita.

export type MessageEventKey =
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "DOCUMENT_PUBLISHED"
  | "ADMIN_NOTICE"
  | "ACCOUNT_VERIFICATION"
  | "PASSWORD_RESET"
  | "STAFF_INVITATION";

export const MESSAGE_EVENT_LABELS: Record<MessageEventKey, string> = {
  APPOINTMENT_BOOKED: "Cita agendada",
  APPOINTMENT_CONFIRMED: "Cita confirmada",
  APPOINTMENT_RESCHEDULED: "Cita reprogramada",
  APPOINTMENT_CANCELLED: "Cita cancelada",
  APPOINTMENT_REMINDER: "Recordatorio de cita",
  DOCUMENT_PUBLISHED: "Documento disponible en el portal",
  ADMIN_NOTICE: "Aviso administrativo",
  ACCOUNT_VERIFICATION: "Verificación de correo",
  PASSWORD_RESET: "Recuperación de contraseña",
  STAFF_INVITATION: "Invitación a la plataforma",
};

/** Eventos de seguridad: solo por correo y sin guardar el contenido del mensaje. */
export const SECURITY_EVENTS: MessageEventKey[] = ["ACCOUNT_VERIFICATION", "PASSWORD_RESET", "STAFF_INVITATION"];

export const TEMPLATE_VARIABLES: Record<string, string> = {
  nombre: "Nombre de la persona destinataria",
  fecha: "Fecha de la cita (por ejemplo, lunes, 13 de octubre de 2026)",
  hora: "Hora de la cita (por ejemplo, 09:30)",
  profesional: "Nombre del profesional",
  servicio: "Nombre del servicio",
  codigo: "Código de la cita",
  clinica: "Nombre de la clínica",
  direccion: "Dirección de la clínica",
  telefono_clinica: "Teléfono principal de la clínica",
  enlace: "Enlace al portal o a la acción correspondiente",
  mensaje: "Texto libre (solo avisos administrativos)",
};

// Orden de parámetros para plantillas de WhatsApp Cloud API ({{1}}, {{2}}, …).
export const WHATSAPP_PARAM_ORDER: Partial<Record<MessageEventKey, string[]>> = {
  APPOINTMENT_BOOKED: ["nombre", "fecha", "hora", "profesional"],
  APPOINTMENT_CONFIRMED: ["nombre", "fecha", "hora", "profesional"],
  APPOINTMENT_RESCHEDULED: ["nombre", "fecha", "hora", "profesional"],
  APPOINTMENT_CANCELLED: ["nombre", "fecha", "hora"],
  APPOINTMENT_REMINDER: ["nombre", "fecha", "hora", "profesional", "direccion"],
  DOCUMENT_PUBLISHED: ["nombre"],
  ADMIN_NOTICE: ["nombre", "mensaje"],
};

type DefaultTemplate = { subject?: string; body: string; whatsappTemplateName?: string };

export const DEFAULT_EMAIL_TEMPLATES: Record<MessageEventKey, DefaultTemplate> = {
  APPOINTMENT_BOOKED: {
    subject: "Tu cita en {{clinica}} fue agendada",
    body:
      "Hola, {{nombre}}:\n\nTu cita fue agendada para el {{fecha}} a las {{hora}} con {{profesional}} ({{servicio}}).\nCódigo de la cita: {{codigo}}.\n\nPuedes consultar, confirmar o cancelar tu cita desde el portal: {{enlace}}\n\nDirección: {{direccion}}\nTeléfono: {{telefono_clinica}}",
  },
  APPOINTMENT_CONFIRMED: {
    subject: "Cita confirmada — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nTu cita del {{fecha}} a las {{hora}} con {{profesional}} quedó confirmada.\nTe recomendamos llegar unos minutos antes.\n\nDirección: {{direccion}}",
  },
  APPOINTMENT_RESCHEDULED: {
    subject: "Tu cita fue reprogramada — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nTu cita fue reprogramada para el {{fecha}} a las {{hora}} con {{profesional}}.\nCódigo de la cita: {{codigo}}.\n\nDetalles en el portal: {{enlace}}",
  },
  APPOINTMENT_CANCELLED: {
    subject: "Tu cita fue cancelada — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nTu cita del {{fecha}} a las {{hora}} fue cancelada.\nSi necesitas una nueva cita, puedes solicitarla en el portal ({{enlace}}) o comunicarte al {{telefono_clinica}}.",
  },
  APPOINTMENT_REMINDER: {
    subject: "Recordatorio: tu cita es el {{fecha}} a las {{hora}}",
    body:
      "Hola, {{nombre}}:\n\nTe recordamos tu cita del {{fecha}} a las {{hora}} con {{profesional}}.\nDirección: {{direccion}}.\n\nSi no puedes asistir, avísanos con anticipación desde el portal ({{enlace}}) o al {{telefono_clinica}}.",
  },
  DOCUMENT_PUBLISHED: {
    subject: "Tienes un nuevo documento disponible — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nHay un nuevo documento disponible en tu portal de paciente. Por tu privacidad, no lo adjuntamos a este mensaje.\nIngresa al portal para consultarlo: {{enlace}}",
  },
  ADMIN_NOTICE: {
    subject: "Aviso de {{clinica}}",
    body: "Hola, {{nombre}}:\n\n{{mensaje}}\n\n{{clinica}} — {{telefono_clinica}}",
  },
  ACCOUNT_VERIFICATION: {
    subject: "Confirma tu correo electrónico — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nPara activar tu cuenta en el portal de pacientes, confirma tu correo ingresando en el siguiente enlace (válido por 24 horas):\n{{enlace}}\n\nSi no creaste esta cuenta, ignora este mensaje.",
  },
  PASSWORD_RESET: {
    subject: "Restablece tu contraseña — {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nRecibimos una solicitud para restablecer tu contraseña. Ingresa en el siguiente enlace (válido por 1 hora):\n{{enlace}}\n\nSi no fuiste tú, ignora este mensaje: tu contraseña no cambiará.",
  },
  STAFF_INVITATION: {
    subject: "Invitación a la plataforma de {{clinica}}",
    body:
      "Hola, {{nombre}}:\n\nTe invitamos a activar tu acceso a la plataforma de {{clinica}}. Para crear tu contraseña ingresa en el siguiente enlace (válido por 72 horas):\n{{enlace}}\n\nSi no esperabas este mensaje, ignóralo.",
  },
};

export const DEFAULT_WHATSAPP_TEMPLATES: Partial<Record<MessageEventKey, DefaultTemplate>> = {
  APPOINTMENT_BOOKED: {
    whatsappTemplateName: "cmio_cita_agendada",
    body: "Hola, {{nombre}}. Tu cita fue agendada para el {{fecha}} a las {{hora}} con {{profesional}}.",
  },
  APPOINTMENT_CONFIRMED: {
    whatsappTemplateName: "cmio_cita_confirmada",
    body: "Hola, {{nombre}}. Tu cita del {{fecha}} a las {{hora}} con {{profesional}} quedó confirmada.",
  },
  APPOINTMENT_RESCHEDULED: {
    whatsappTemplateName: "cmio_cita_reprogramada",
    body: "Hola, {{nombre}}. Tu cita fue reprogramada para el {{fecha}} a las {{hora}} con {{profesional}}.",
  },
  APPOINTMENT_CANCELLED: {
    whatsappTemplateName: "cmio_cita_cancelada",
    body: "Hola, {{nombre}}. Tu cita del {{fecha}} a las {{hora}} fue cancelada.",
  },
  APPOINTMENT_REMINDER: {
    whatsappTemplateName: "cmio_recordatorio_cita",
    body: "Hola, {{nombre}}. Te recordamos tu cita del {{fecha}} a las {{hora}} con {{profesional}} en {{direccion}}.",
  },
  DOCUMENT_PUBLISHED: {
    whatsappTemplateName: "cmio_documento_disponible",
    body: "Hola, {{nombre}}. Tienes un nuevo documento disponible en tu portal de paciente.",
  },
  ADMIN_NOTICE: {
    whatsappTemplateName: "cmio_aviso_administrativo",
    body: "Hola, {{nombre}}. {{mensaje}}",
  },
};

/** Reemplaza {{variable}} por su valor. Las variables desconocidas quedan vacías. */
export function renderTemplate(template: string, vars: Record<string, string | undefined>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
