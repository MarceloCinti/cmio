import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { buildActor } from "@/server/auth/actor";
import { changeUserRole, inviteStaffUser, setRolePermissions, setUserActive } from "@/server/services/users";
import { getSiteContent, publishContent, saveContentDraft, updateSystemSetting } from "@/server/services/settings";
import { exportAppointmentsCsv, getOperationalReport } from "@/server/services/reports";
import { listAuditLogs } from "@/server/services/audit-log";
import { createScheduleException, replaceScheduleRules } from "@/server/services/schedules";
import { saveProfessional, saveService } from "@/server/services/catalog";
import { submitContactForm } from "@/server/services/contact-requests";
import { bookAppointment } from "@/server/services/appointments";
import { validateSessionToken } from "@/server/auth/session";
import { login } from "@/server/services/auth";
import { ForbiddenError, RateLimitError, ValidationError } from "@/server/errors";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content";
import { addDaysISO, localToUtc, todayISO } from "@/lib/time";
import { META, actorFor, createPatient, createProfessionalWithSchedule, createUser, resetDatabase } from "../helpers/db";

describe("Usuarios, roles y escalada de privilegios", () => {
  beforeEach(resetDatabase);

  it("un administrador no puede crear propietarios ni administradores", async () => {
    const admin = await actorFor((await createUser("ADMIN")).id);
    await expect(inviteStaffUser(admin, { name: "Nueva Persona", email: "x@prueba.local", role: "OWNER" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(inviteStaffUser(admin, { name: "Nueva Persona", email: "y@prueba.local", role: "ADMIN" })).rejects.toBeInstanceOf(ForbiddenError);
    const res = await inviteStaffUser(admin, { name: "Nueva Secretaria", email: "z@prueba.local", role: "SECRETARY" });
    expect(res.link).toContain("/invitacion?token=");
    const created = await db.user.findUniqueOrThrow({ where: { email: "z@prueba.local" } });
    expect(created.status).toBe("INVITED");
    expect(created.passwordHash).toBeNull();
  });

  it("nadie puede cambiar su propio rol ni quitar al último propietario", async () => {
    const ownerUser = await createUser("OWNER");
    const owner = await actorFor(ownerUser.id);
    await expect(changeUserRole(owner, ownerUser.id, "ADMIN")).rejects.toBeInstanceOf(ForbiddenError);
    const admin = await actorFor((await createUser("ADMIN")).id);
    await expect(changeUserRole(admin, ownerUser.id, "SECRETARY")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setUserActive(admin, ownerUser.id, false)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("la secretaría no puede gestionar usuarios ni configuraciones", async () => {
    const sec = await actorFor((await createUser("SECRETARY")).id);
    await expect(inviteStaffUser(sec, { name: "Otra Persona", email: "o@prueba.local", role: "DOCTOR" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateSystemSetting(sec, "booking", {})).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveContentDraft(sec, "landing", DEFAULT_SITE_CONTENT.landing)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getOperationalReport(sec, { fromISO: todayISO(), toISO: todayISO() })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("al desactivar una cuenta se cierran sus sesiones", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    const doc = await createUser("DOCTOR", { password: "Clave-del-medico-1" });
    const s = await login({ email: doc.email, password: "Clave-del-medico-1" }, META);
    await setUserActive(owner, doc.id, false);
    expect(await validateSessionToken(s.token)).toBeNull();
    expect(await db.auditLog.count({ where: { action: "usuarios.desactivar", entityId: doc.id } })).toBe(1);
  });

  it("solo el propietario configura permisos y nunca por encima del límite del rol", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    const admin = await actorFor((await createUser("ADMIN")).id);
    await expect(setRolePermissions(admin, "SECRETARY", ["informes.ver"])).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setRolePermissions(owner, "SECRETARY", ["clinica.exportar"])).rejects.toBeInstanceOf(ValidationError);
    await setRolePermissions(owner, "SECRETARY", ["citas.gestionar"]);
    const secUser = await createUser("SECRETARY");
    const sec = await buildActor(secUser.id);
    expect([...sec!.permissions]).toEqual(["citas.gestionar"]);
  });
});

describe("Contenido con borrador y publicación", () => {
  beforeEach(resetDatabase);

  it("los cambios en borrador no se publican hasta confirmarlos y quedan versionados", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    const landing = { ...DEFAULT_SITE_CONTENT.landing, hero: { ...DEFAULT_SITE_CONTENT.landing.hero, title: "Título en borrador" } };
    await saveContentDraft(owner, "landing", landing);
    expect((await getSiteContent("published")).landing.hero.title).toBe(DEFAULT_SITE_CONTENT.landing.hero.title);
    expect((await getSiteContent("draft")).landing.hero.title).toBe("Título en borrador");
    expect(await publishContent(owner)).toEqual(["landing"]);
    expect((await getSiteContent("published")).landing.hero.title).toBe("Título en borrador");
    expect(await db.siteContentVersion.count({ where: { key: "landing" } })).toBe(1);
  });

  it("valida el contenido y rechaza colores inválidos", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    await expect(saveContentDraft(owner, "branding", { ...DEFAULT_SITE_CONTENT.branding, primaryColor: "red; background:url(x)" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("Catálogo", () => {
  beforeEach(resetDatabase);

  it("no permite publicar servicios sin confirmar ni perfiles incompletos", async () => {
    const admin = await actorFor((await createUser("ADMIN")).id);
    await expect(
      saveService(admin, null, { name: "Estudio X", summary: "Prueba", category: "IMAGING", durationMinutes: "30", capacityPerSlot: "1", sortOrder: "0", isPublished: "on" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      saveProfessional(admin, null, { firstName: "Perfil", lastName: "Incompleto", status: "ACTIVE", isPublished: "on", sortOrder: "0" }),
    ).rejects.toThrow(/Para publicar el perfil/);
  });
});

describe("Vinculación de cuentas a perfiles profesionales", () => {
  beforeEach(resetDatabase);

  const base = { firstName: "Perfil", lastName: "Prueba", status: "ACTIVE", sortOrder: "0" };

  it("solo el propietario vincula cuentas, solo de rol profesional y nunca la propia", async () => {
    const ownerUser = await createUser("OWNER");
    const owner = await actorFor(ownerUser.id);
    const adminUser = await createUser("ADMIN");
    const admin = await actorFor(adminUser.id);
    const doctorUser = await createUser("DOCTOR");
    const id = await saveProfessional(admin, null, base);
    // La administración no puede vincularse (ni vincular a otros) para obtener acceso clínico.
    await expect(saveProfessional(admin, id, { ...base, userId: adminUser.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveProfessional(admin, id, { ...base, userId: doctorUser.id })).rejects.toBeInstanceOf(ForbiddenError);
    // El propietario tampoco puede vincular su propia cuenta ni cuentas que no sean de profesionales.
    await expect(saveProfessional(owner, id, { ...base, userId: ownerUser.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveProfessional(owner, id, { ...base, userId: adminUser.id })).rejects.toBeInstanceOf(ValidationError);
    await saveProfessional(owner, id, { ...base, userId: doctorUser.id });
    expect((await buildActor(doctorUser.id))?.professionalId).toBe(id);
    // Editar el perfil sin el campo de cuenta conserva la vinculación.
    await saveProfessional(admin, id, { ...base, lastName: "Editado" });
    expect((await db.professional.findUniqueOrThrow({ where: { id } })).userId).toBe(doctorUser.id);
    expect(await db.auditLog.count({ where: { action: "catalogo.profesional_editar", entityId: id } })).toBe(2);
  });

  it("una cuenta administrativa vinculada a un perfil no obtiene acceso clínico", async () => {
    const adminUser = await createUser("ADMIN");
    const admin = await actorFor(adminUser.id);
    const id = await saveProfessional(admin, null, base);
    await db.professional.update({ where: { id }, data: { userId: adminUser.id } });
    const actor = await buildActor(adminUser.id);
    expect(actor?.professionalId).toBeNull();
  });
});

describe("Horarios y bloqueos", () => {
  beforeEach(resetDatabase);

  it("rechaza bloques superpuestos y avisa de citas afectadas por un bloqueo", async () => {
    const admin = await actorFor((await createUser("ADMIN")).id);
    const { professional, service } = await createProfessionalWithSchedule();
    await expect(replaceScheduleRules(admin, professional.id, { weekday: ["1", "1"], start: ["08:00", "11:00"], end: ["12:00", "13:00"] })).rejects.toThrow(/se superponen/);
    const { patient } = await createPatient();
    const sec = await actorFor((await createUser("SECRETARY")).id);
    const day = addDaysISO(todayISO(), 3);
    await bookAppointment(sec, { patientId: patient.id, professionalId: professional.id, serviceId: service.id, startsAt: localToUtc(day, 540).toISOString() });
    const res = await createScheduleException(admin, { professionalId: professional.id, kind: "VACATION", title: "Vacaciones", startDate: day, endDate: day, allDay: "on" });
    expect(res.affected).toBe(1);
    // La secretaría no registra feriados de la clínica por defecto.
    await expect(createScheduleException(sec, { kind: "HOLIDAY", title: "Feriado", startDate: day, endDate: day, allDay: "on" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Informes y exportaciones", () => {
  beforeEach(resetDatabase);

  it("calcula indicadores con datos reales y exporta un CSV seguro y auditado", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    const sec = await actorFor((await createUser("SECRETARY")).id);
    const { professional, service } = await createProfessionalWithSchedule();
    const { patient } = await createPatient();
    await db.patient.update({ where: { id: patient.id }, data: { lastName: '=HYPERLINK("x")' } });
    const day = addDaysISO(todayISO(), 2);
    await bookAppointment(sec, { patientId: patient.id, professionalId: professional.id, serviceId: service.id, startsAt: localToUtc(day, 540).toISOString() });
    const report = await getOperationalReport(owner, { fromISO: day, toISO: day });
    expect(report.total).toBe(1);
    expect(report.availableMinutes).toBe(240);
    expect(report.occupancy).toBe(13); // 30 / 240
    const csv = await exportAppointmentsCsv(owner, { fromISO: day, toISO: day });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/0981000000/); // sin teléfonos
    expect(await db.auditLog.count({ where: { action: "informes.exportar_citas" } })).toBe(1);
    await expect(exportAppointmentsCsv(sec, { fromISO: day, toISO: day })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Auditoría", () => {
  beforeEach(resetDatabase);

  it("los registros no pueden modificarse ni eliminarse", async () => {
    const owner = await actorFor((await createUser("OWNER")).id);
    await listAuditLogs(owner, { fromISO: todayISO(), toISO: todayISO() });
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "auditoria.consultar" } });
    await expect(db.auditLog.update({ where: { id: log.id }, data: { action: "otra" } })).rejects.toThrow(/CMIO_INMUTABLE/);
    await expect(db.auditLog.delete({ where: { id: log.id } })).rejects.toThrow(/CMIO_INMUTABLE/);
  });
});

describe("Formularios públicos", () => {
  beforeEach(resetDatabase);

  it("limita envíos abusivos y descarta bots", async () => {
    const meta = { ip: "203.0.113.9", userAgent: "test" };
    const valid = { fullName: "Persona Prueba", phone: "0981 123 456", message: "Consulta de prueba", consent: "on" };
    // El campo trampa se acepta en silencio (sin revelar el filtro) y no se guarda.
    await submitContactForm({ ...valid, website: "spam" }, meta);
    for (let i = 0; i < 4; i++) await submitContactForm(valid, meta);
    expect(await db.contactRequest.count()).toBe(4);
    await expect(submitContactForm(valid, meta)).rejects.toBeInstanceOf(RateLimitError);
    await expect(submitContactForm({ ...valid, consent: undefined }, { ...meta, ip: "203.0.113.10" })).rejects.toBeInstanceOf(ValidationError);
  });
});
