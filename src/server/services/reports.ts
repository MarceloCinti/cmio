import "server-only";
import { db } from "@/server/db";
import { assertCan, type Actor } from "@/server/auth/actor";
import { audit } from "@/server/audit";
import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { daysBetweenISO, isoToDbDate, localDayRange, localISODateOf, localToUtc, weekdayOfISO } from "@/lib/time";
import { formatDate, formatTime } from "./report-format";
import { BLOCKING_STATUSES } from "./availability";
import { professionalDisplayName } from "./public-site";

export type ReportFilters = { fromISO: string; toISO: string; professionalId?: string | null; specialtyId?: string | null };

function appointmentWhere(f: ReportFilters): Prisma.AppointmentWhereInput {
  return {
    startsAt: { gte: localDayRange(f.fromISO).start, lt: localDayRange(f.toISO).end },
    ...(f.professionalId ? { professionalId: f.professionalId } : {}),
    ...(f.specialtyId ? { service: { specialtyId: f.specialtyId } } : {}),
  };
}

/** Minutos de agenda disponibles (reglas semanales menos bloqueos) en el período. */
async function availableMinutes(f: ReportFilters) {
  const professionals = await db.professional.findMany({
    where: {
      status: "ACTIVE",
      ...(f.professionalId ? { id: f.professionalId } : {}),
      ...(f.specialtyId ? { specialties: { some: { specialtyId: f.specialtyId } } } : {}),
    },
    select: { id: true, scheduleRules: true },
  });
  if (!professionals.length) return 0;
  const start = localDayRange(f.fromISO).start;
  const end = localDayRange(f.toISO).end;
  const exceptions = await db.scheduleException.findMany({
    where: { startsAt: { lt: end }, endsAt: { gt: start }, OR: [{ professionalId: null }, { professionalId: { in: professionals.map((p) => p.id) } }] },
  });
  let total = 0;
  for (const day of daysBetweenISO(f.fromISO, f.toISO)) {
    const wd = weekdayOfISO(day);
    const dayDate = isoToDbDate(day).getTime();
    for (const p of professionals) {
      for (const r of p.scheduleRules) {
        if (r.weekday !== wd) continue;
        if (r.validFrom && dayDate < r.validFrom.getTime()) continue;
        if (r.validUntil && dayDate > r.validUntil.getTime()) continue;
        const bs = localToUtc(day, r.startMinute).getTime();
        const be = localToUtc(day, r.endMinute).getTime();
        let blocked = 0;
        for (const e of exceptions) {
          if (e.professionalId && e.professionalId !== p.id) continue;
          const os = Math.max(bs, e.startsAt.getTime());
          const oe = Math.min(be, e.endsAt.getTime());
          if (oe > os) blocked += oe - os;
        }
        total += Math.max(0, be - bs - blocked) / 60000;
      }
    }
  }
  return Math.round(total);
}

export async function getOperationalReport(actor: Actor, f: ReportFilters) {
  assertCan(actor, "informes.ver", "No tienes permiso para ver los informes.");
  const where = appointmentWhere(f);
  const [byStatus, appointments, newPatients, available] = await Promise.all([
    db.appointment.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.appointment.findMany({
      where,
      select: { startsAt: true, endsAt: true, status: true, source: true, service: { select: { specialty: { select: { id: true, name: true } } } } },
    }),
    db.patient.count({ where: { createdAt: { gte: localDayRange(f.fromISO).start, lt: localDayRange(f.toISO).end } } }),
    availableMinutes(f),
  ]);
  const count = (s: AppointmentStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const total = appointments.length;
  const bookedMinutes = appointments
    .filter((a) => BLOCKING_STATUSES.includes(a.status))
    .reduce((sum, a) => sum + (a.endsAt.getTime() - a.startsAt.getTime()) / 60000, 0);
  const bySpecialty = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const day of daysBetweenISO(f.fromISO, f.toISO)) byDay.set(day, 0);
  for (const a of appointments) {
    if (a.status === "CANCELLED") continue;
    const name = a.service.specialty?.name ?? "Sin especialidad";
    bySpecialty.set(name, (bySpecialty.get(name) ?? 0) + 1);
    const d = localISODateOf(a.startsAt);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const statusRows = (Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => ({ status: s, count: count(s) }));
  return {
    total,
    scheduled: count("SCHEDULED"),
    confirmed: count("CONFIRMED"),
    completed: count("COMPLETED"),
    cancelled: count("CANCELLED"),
    noShow: count("NO_SHOW"),
    fromPortal: appointments.filter((a) => a.source === "PORTAL").length,
    newPatients,
    availableMinutes: available,
    bookedMinutes: Math.round(bookedMinutes),
    occupancy: available > 0 ? Math.min(100, Math.round((bookedMinutes / available) * 100)) : null,
    bySpecialty: [...bySpecialty.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byDay: [...byDay.entries()].map(([key, value]) => ({ key, value })),
    statusRows,
  };
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita inyección de fórmulas al abrir el CSV en planillas de cálculo.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Exportación de citas (datos administrativos mínimos, sin información clínica). */
export async function exportAppointmentsCsv(actor: Actor, f: ReportFilters) {
  assertCan(actor, "informes.exportar", "No tienes permiso para exportar informes.");
  const rows = await db.appointment.findMany({
    where: appointmentWhere(f),
    orderBy: { startsAt: "asc" },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      professional: { select: { honorific: true, firstName: true, lastName: true } },
      service: { select: { name: true, specialty: { select: { name: true } } } },
    },
  });
  const header = ["Código", "Fecha", "Hora", "Profesional", "Especialidad", "Servicio", "Estado", "Origen", "Paciente"];
  const lines = rows.map((a) =>
    [
      a.code,
      formatDate(a.startsAt),
      formatTime(a.startsAt),
      professionalDisplayName(a.professional),
      a.service.specialty?.name ?? "",
      a.service.name,
      APPOINTMENT_STATUS_LABELS[a.status],
      a.source === "PORTAL" ? "Portal" : "Personal",
      `${a.patient.lastName}, ${a.patient.firstName}`,
    ]
      .map(csvCell)
      .join(";"),
  );
  await audit(actor, {
    action: "informes.exportar_citas",
    details: { desde: f.fromISO, hasta: f.toISO, profesional: f.professionalId ?? null, especialidad: f.specialtyId ?? null, filas: rows.length },
  });
  // BOM para que las planillas reconozcan UTF-8 (acentos).
  return `﻿${[header.map(csvCell).join(";"), ...lines].join("\r\n")}`;
}

/** Pendientes de configuración antes de publicar el sitio y operar. */
export async function getSetupChecklist() {
  const [rows, pendingServices, draftPros, prosWithoutSchedule, owners] = await Promise.all([
    db.siteContent.findMany({ where: { key: { in: ["institution", "legal", "landing"] } } }),
    db.service.count({ where: { availabilityConfirmed: false } }),
    db.professional.count({ where: { status: "DRAFT" } }),
    db.professional.count({ where: { status: "ACTIVE", scheduleRules: { none: {} } } }),
    db.user.count({ where: { role: "OWNER", status: "ACTIVE" } }),
  ]);
  const get = (k: string) => rows.find((r) => r.key === k)?.published as Record<string, unknown> | undefined;
  const institution = get("institution");
  const legal = get("legal");
  const landing = get("landing") as { about?: { blocks?: { provisional?: boolean; visible?: boolean }[] } } | undefined;
  const provisional = landing?.about?.blocks?.filter((b) => b.provisional && b.visible).length ?? 0;
  return {
    contactVerified: Boolean(institution?.contactVerified),
    legalReviewed: Boolean(legal?.reviewedByLegalCounsel),
    provisionalBlocks: provisional,
    pendingServices,
    draftPros,
    prosWithoutSchedule,
    owners,
  };
}
