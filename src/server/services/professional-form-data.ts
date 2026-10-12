import "server-only";
import { db } from "@/server/db";

export async function professionalFormOptions(currentUserId: string | null) {
  const [specialties, services, users] = await Promise.all([
    db.specialty.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.service.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, availabilityConfirmed: true } }),
    db.user.findMany({
      where: { role: { in: ["OWNER", "ADMIN", "DOCTOR"] }, status: { not: "DISABLED" }, OR: [{ professional: null }, ...(currentUserId ? [{ id: currentUserId }] : [])] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);
  return {
    specialties,
    services: services.map((s) => ({ id: s.id, name: s.name, confirmed: s.availabilityConfirmed })),
    users: users.map((u) => ({ id: u.id, label: `${u.name} (${u.email})` })),
  };
}
