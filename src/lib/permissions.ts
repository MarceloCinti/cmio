// Catálogo de permisos y roles. Este archivo no contiene lógica de autorización:
// las comprobaciones se hacen siempre en el servidor (src/server/auth/authorize.ts).

export const ROLES = ["OWNER", "ADMIN", "SECRETARY", "DOCTOR", "PATIENT"] as const;
export type RoleKey = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  SECRETARY: "Secretaría",
  DOCTOR: "Profesional de la salud",
  PATIENT: "Paciente",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  OWNER: "Control total de la clínica, incluidos roles y permisos.",
  ADMIN: "Administra la operación según los permisos que le asigne el propietario.",
  SECRETARY: "Gestiona pacientes, citas y recepción. No accede a información clínica.",
  DOCTOR: "Atiende pacientes, gestiona su agenda y registra la historia clínica.",
  PATIENT: "Accede a su portal: citas, documentos autorizados y seguimiento.",
};

// Jerarquía para asignar roles: solo se pueden asignar roles de menor jerarquía.
export const ROLE_RANK: Record<RoleKey, number> = {
  OWNER: 100,
  ADMIN: 80,
  SECRETARY: 40,
  DOCTOR: 40,
  PATIENT: 10,
};

export const PERMISSIONS = {
  "agenda.ver_todas": "Ver la agenda de todos los profesionales",
  "citas.gestionar": "Crear, confirmar, cancelar y reprogramar citas de cualquier paciente",
  "citas.sobreturno": "Agendar sobreturnos y resolver conflictos de horario",
  "recepcion.gestionar": "Registrar llegadas, sala de espera y ausencias",
  "solicitudes.gestionar": "Atender solicitudes de cita y mensajes del sitio web",
  "pacientes.ver": "Buscar y consultar datos administrativos de pacientes",
  "pacientes.gestionar": "Registrar y editar datos administrativos de pacientes",
  "documentos.subir": "Subir documentos de pacientes para revisión profesional",
  "catalogo.gestionar": "Gestionar especialidades, servicios y perfiles profesionales",
  "horarios.gestionar": "Gestionar disponibilidad de todos los profesionales, bloqueos y feriados",
  "contenido.gestionar": "Editar y publicar el contenido del sitio web y las preguntas frecuentes",
  "configuracion.gestionar": "Modificar políticas de agenda, notificaciones y parámetros generales",
  "usuarios.gestionar": "Invitar, crear, editar y desactivar usuarios",
  "informes.ver": "Ver el panel de indicadores y los informes",
  "informes.exportar": "Exportar informes administrativos (sin datos clínicos)",
  "mensajes.gestionar": "Ver el registro de envíos, editar plantillas y reintentar mensajes",
  "auditoria.ver": "Consultar el registro de auditoría",
  "clinica.exportar": "Exportar historias clínicas completas (queda registrado)",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  {
    title: "Agenda y recepción",
    permissions: ["agenda.ver_todas", "citas.gestionar", "citas.sobreturno", "recepcion.gestionar", "solicitudes.gestionar"],
  },
  { title: "Pacientes", permissions: ["pacientes.ver", "pacientes.gestionar", "documentos.subir"] },
  {
    title: "Administración",
    permissions: [
      "catalogo.gestionar",
      "horarios.gestionar",
      "contenido.gestionar",
      "configuracion.gestionar",
      "usuarios.gestionar",
      "mensajes.gestionar",
    ],
  },
  { title: "Informes y control", permissions: ["informes.ver", "informes.exportar", "auditoria.ver", "clinica.exportar"] },
];

// Roles cuyos permisos puede configurar el propietario.
export const CONFIGURABLE_ROLES = ["ADMIN", "SECRETARY", "DOCTOR"] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

// Límite superior: permisos que cada rol PUEDE recibir. Ningún ajuste de la interfaz
// puede otorgar permisos fuera de esta lista (p. ej., la secretaría nunca exporta
// historias clínicas).
export const ROLE_PERMISSION_CEILING: Record<ConfigurableRole, Permission[]> = {
  ADMIN: PERMISSION_KEYS,
  SECRETARY: [
    "agenda.ver_todas",
    "citas.gestionar",
    "citas.sobreturno",
    "recepcion.gestionar",
    "solicitudes.gestionar",
    "pacientes.ver",
    "pacientes.gestionar",
    "documentos.subir",
    "horarios.gestionar",
    "informes.ver",
    "mensajes.gestionar",
  ],
  DOCTOR: [
    "agenda.ver_todas",
    "citas.gestionar",
    "recepcion.gestionar",
    "pacientes.ver",
    "documentos.subir",
    "informes.ver",
  ],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<ConfigurableRole, Permission[]> = {
  ADMIN: PERMISSION_KEYS.filter((p) => p !== "clinica.exportar"),
  SECRETARY: [
    "agenda.ver_todas",
    "citas.gestionar",
    "citas.sobreturno",
    "recepcion.gestionar",
    "solicitudes.gestionar",
    "pacientes.ver",
    "pacientes.gestionar",
    "documentos.subir",
  ],
  DOCTOR: ["pacientes.ver", "documentos.subir"],
};

export function isStaffRole(role: RoleKey) {
  return role !== "PATIENT";
}
