import type { Permission } from "@/lib/permissions";

export type NavIconName =
  | "home"
  | "calendar"
  | "reception"
  | "plus"
  | "inbox"
  | "users"
  | "clock"
  | "stethoscope"
  | "layers"
  | "briefcase"
  | "holiday"
  | "user-cog"
  | "shield"
  | "globe"
  | "help"
  | "settings"
  | "send"
  | "chart"
  | "audit"
  | "account"
  | "bell"
  | "file";

export type NavItem = { href: string; label: string; icon: NavIconName; badge?: number };
export type NavGroup = { title?: string; items: NavItem[] };

type NavRule = NavItem & {
  perms?: Permission[];
  clinician?: boolean;
  ownerOnly?: boolean;
  /** Visible si tiene alguno de los permisos O es profesional. */
  clinicianOr?: Permission[];
};

const GROUPS: { title?: string; items: NavRule[] }[] = [
  {
    items: [
      { href: "/panel", label: "Inicio", icon: "home" },
      { href: "/panel/agenda", label: "Agenda", icon: "calendar", clinicianOr: ["agenda.ver_todas"] },
      { href: "/panel/recepcion", label: "Recepción", icon: "reception", perms: ["recepcion.gestionar"] },
      { href: "/panel/citas/nueva", label: "Nueva cita", icon: "plus", perms: ["citas.gestionar"] },
      { href: "/panel/solicitudes", label: "Solicitudes web", icon: "inbox", perms: ["solicitudes.gestionar"] },
      { href: "/panel/pacientes", label: "Pacientes", icon: "users", clinicianOr: ["pacientes.ver"] },
      { href: "/panel/mi-disponibilidad", label: "Mi disponibilidad", icon: "clock", clinician: true },
    ],
  },
  {
    title: "Clínica",
    items: [
      { href: "/panel/profesionales", label: "Profesionales", icon: "stethoscope", perms: ["catalogo.gestionar"] },
      { href: "/panel/especialidades", label: "Especialidades", icon: "layers", perms: ["catalogo.gestionar"] },
      { href: "/panel/servicios", label: "Servicios", icon: "briefcase", perms: ["catalogo.gestionar"] },
      { href: "/panel/feriados", label: "Feriados y cierres", icon: "holiday", perms: ["horarios.gestionar"] },
    ],
  },
  {
    title: "Sitio web",
    items: [
      { href: "/panel/contenido", label: "Contenido del sitio", icon: "globe", perms: ["contenido.gestionar"] },
      { href: "/panel/preguntas", label: "Preguntas frecuentes", icon: "help", perms: ["contenido.gestionar"] },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/panel/informes", label: "Informes", icon: "chart", perms: ["informes.ver"] },
      { href: "/panel/usuarios", label: "Usuarios", icon: "user-cog", perms: ["usuarios.gestionar"] },
      { href: "/panel/roles", label: "Roles y permisos", icon: "shield", ownerOnly: true },
      { href: "/panel/mensajes", label: "Mensajes y plantillas", icon: "send", perms: ["mensajes.gestionar"] },
      { href: "/panel/configuracion", label: "Configuración", icon: "settings", perms: ["configuracion.gestionar"] },
      { href: "/panel/auditoria", label: "Auditoría", icon: "audit", perms: ["auditoria.ver"] },
    ],
  },
];

export function buildPanelNav(ctx: {
  role: string;
  permissions: ReadonlySet<Permission>;
  isClinician: boolean;
  badges?: Partial<Record<string, number>>;
}): NavGroup[] {
  const has = (p: Permission) => ctx.role === "OWNER" || ctx.permissions.has(p);
  return GROUPS.map((g) => ({
    title: g.title,
    items: g.items
      .filter((i) => {
        if (i.ownerOnly) return ctx.role === "OWNER";
        if (i.clinician) return ctx.isClinician;
        if (i.clinicianOr) return ctx.isClinician || i.clinicianOr.some(has);
        if (i.perms) return i.perms.some(has);
        return true;
      })
      .map(({ href, label, icon }) => ({ href, label, icon, badge: ctx.badges?.[href] })),
  })).filter((g) => g.items.length > 0);
}
