// Cuentas del entorno de DEMOSTRACIÓN (datos ficticios). Sus contraseñas son públicas:
// solo existen en bases cargadas con `pnpm db:seed:demo` y solo se muestran en la pantalla
// de ingreso cuando DEMO_MODE=true. Nunca se cargan en producción.

export type DemoAccount = {
  email: string;
  password: string;
  role: "OWNER" | "ADMIN" | "SECRETARY" | "DOCTOR" | "PATIENT";
  name: string;
  /** Qué puede ver esta cuenta (se muestra en la pantalla de ingreso). */
  description: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "propietario@demo.cmio.local",
    password: "Demo-Propietario-2026",
    role: "OWNER",
    name: "Propietario Demo",
    description: "Todo el panel: indicadores, informes, contenido, usuarios y auditoría.",
  },
  {
    email: "admin@demo.cmio.local",
    password: "Demo-Admin-2026",
    role: "ADMIN",
    name: "Administración Demo",
    description: "Gestión de la clínica según los permisos que asigne el propietario.",
  },
  {
    email: "secretaria@demo.cmio.local",
    password: "Demo-Secretaria-2026",
    role: "SECRETARY",
    name: "Secretaría Demo",
    description: "Agenda, recepción, pacientes y solicitudes, sin datos clínicos.",
  },
  {
    email: "medico@demo.cmio.local",
    password: "Demo-Medico-2026",
    role: "DOCTOR",
    name: "Profesional Demo Clínica",
    description: "Su agenda y la historia clínica de sus pacientes.",
  },
  {
    email: "nutricion@demo.cmio.local",
    password: "Demo-Nutricion-2026",
    role: "DOCTOR",
    name: "Profesional Demo Nutrición",
    description: "Su agenda y la historia clínica de sus pacientes de nutrición.",
  },
  {
    email: "paciente@demo.cmio.local",
    password: "Demo-Paciente-2026",
    role: "PATIENT",
    name: "Paciente Demo Uno",
    description: "Portal del paciente: citas, documentos y seguimiento.",
  },
];

export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
}
