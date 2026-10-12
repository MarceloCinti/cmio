import "server-only";
import { db } from "@/server/db";

/** Catálogo para la reserva en línea: solo servicios confirmados y profesionales habilitados. */
export async function getOnlineBookingCatalog() {
  const [specialties, professionals] = await Promise.all([
    db.specialty.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        summary: true,
        services: {
          where: { isPublished: true, availabilityConfirmed: true, bookableOnline: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, summary: true, durationMinutes: true, price: true, showPrice: true, preparationNotes: true },
        },
      },
    }),
    db.professional.findMany({
      where: { status: "ACTIVE", isPublished: true, acceptsOnlineBooking: true },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        honorific: true,
        firstName: true,
        lastName: true,
        photoPath: true,
        services: { select: { serviceId: true } },
        scheduleRules: { select: { id: true }, take: 1 },
      },
    }),
  ]);
  const profs = professionals
    .filter((p) => p.scheduleRules.length > 0)
    .map((p) => ({
      id: p.id,
      name: [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" "),
      photoPath: p.photoPath,
      serviceIds: p.services.map((s) => s.serviceId),
    }));
  const bookableServiceIds = new Set(profs.flatMap((p) => p.serviceIds));
  return {
    specialties: specialties
      .map((s) => ({ ...s, services: s.services.filter((svc) => bookableServiceIds.has(svc.id)) }))
      .filter((s) => s.services.length > 0),
    professionals: profs,
  };
}

/** Catálogo para el personal (incluye servicios no publicados pero confirmados). */
export async function getStaffBookingCatalog() {
  const [services, professionals] = await Promise.all([
    db.service.findMany({
      where: { availabilityConfirmed: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, durationMinutes: true, specialty: { select: { name: true } } },
    }),
    db.professional.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ lastName: "asc" }],
      select: { id: true, honorific: true, firstName: true, lastName: true, services: { select: { serviceId: true } } },
    }),
  ]);
  return {
    services,
    professionals: professionals.map((p) => ({
      id: p.id,
      name: [p.honorific, p.firstName, p.lastName].filter(Boolean).join(" "),
      serviceIds: p.services.map((s) => s.serviceId),
    })),
  };
}
