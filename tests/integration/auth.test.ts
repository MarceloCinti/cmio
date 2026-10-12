import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  acceptInvitation,
  changePassword,
  issueToken,
  login,
  registerPatient,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "@/server/services/auth";
import { validateSessionToken } from "@/server/auth/session";
import { AppError, RateLimitError, ValidationError } from "@/server/errors";
import { META, actorFor, createPatient, createUser, lastEmailTo, resetDatabase, tokenFromEmail } from "../helpers/db";

const validRegistration = {
  firstName: "Ana",
  lastName: "Benítez",
  documentType: "CI",
  documentNumber: "4.567.890",
  birthDate: "1990-04-12",
  phone: "0981 555 444",
  email: "Ana.Benitez@Ejemplo.com",
  password: "una frase segura 2026",
  passwordConfirm: "una frase segura 2026",
  acceptTerms: "on",
  emailOptIn: "on",
};

describe("Registro y verificación de pacientes", () => {
  beforeEach(resetDatabase);

  it("registra un paciente con rol PACIENTE, consentimientos y correo de verificación", async () => {
    const res = await registerPatient(validRegistration, META);
    expect(res.email).toBe("ana.benitez@ejemplo.com");
    const user = await db.user.findUniqueOrThrow({ where: { email: res.email }, include: { patient: { include: { consents: true } } } });
    expect(user.role).toBe("PATIENT");
    expect(user.status).toBe("PENDING_VERIFICATION");
    expect(user.passwordHash).not.toContain("una frase segura");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.patient?.documentNumber).toBe("4567890");
    const consents = Object.fromEntries(user.patient!.consents.map((c) => [c.type, c.granted]));
    expect(consents).toEqual({ DATA_PROCESSING: true, EMAIL_NOTIFICATIONS: true, WHATSAPP_NOTIFICATIONS: false });

    // No puede ingresar antes de confirmar el correo
    await expect(login({ email: res.email, password: validRegistration.password }, META)).rejects.toThrow(/confirma tu correo/i);

    const mail = lastEmailTo(res.email);
    expect(mail).toBeTruthy();
    await verifyEmail(tokenFromEmail(mail!), META);
    const session = await login({ email: res.email, password: validRegistration.password }, META);
    expect(session.role).toBe("PATIENT");
    // El token de verificación no puede reutilizarse
    await expect(verifyEmail(tokenFromEmail(mail!), META)).rejects.toThrow(AppError);
  });

  it("ignora cualquier intento de elegir un rol privilegiado durante el registro", async () => {
    const res = await registerPatient({ ...validRegistration, role: "OWNER", status: "ACTIVE" }, META);
    const user = await db.user.findUniqueOrThrow({ where: { email: res.email } });
    expect(user.role).toBe("PATIENT");
    expect(user.status).toBe("PENDING_VERIFICATION");
  });

  it("rechaza contraseñas débiles y que no coinciden, con mensajes en español", async () => {
    await expect(registerPatient({ ...validRegistration, password: "corta", passwordConfirm: "corta" }, META)).rejects.toMatchObject({
      fieldErrors: { password: [expect.stringContaining("al menos 10 caracteres")] },
    });
    await expect(registerPatient({ ...validRegistration, passwordConfirm: "otra frase distinta" }, META)).rejects.toMatchObject({
      fieldErrors: { passwordConfirm: ["Las contraseñas no coinciden."] },
    });
  });

  it("no vincula una ficha existente ni revela en pantalla si el documento o el correo ya existen", async () => {
    await createPatient({ documentNumber: "4567890" });
    // Respuesta idéntica a un registro exitoso; el aviso llega solo al correo indicado.
    const email = validRegistration.email.toLowerCase();
    await expect(registerPatient(validRegistration, META)).resolves.toEqual({ email });
    expect(await db.user.count()).toBe(0);
    const notice = await db.outboundMessage.findFirstOrThrow({ where: { recipient: email, event: "ADMIN_NOTICE" } });
    expect(notice.body).toContain("secretaría");
    // Correo ya registrado: misma respuesta, sin crear otra cuenta.
    const existing = await createUser("PATIENT", { email: "existente@prueba.local" });
    await expect(registerPatient({ ...validRegistration, email: existing.email, documentNumber: "7654321" }, META)).resolves.toEqual({ email: existing.email });
    expect(await db.user.count()).toBe(1);
    expect(await db.auditLog.count({ where: { action: "auth.registro_duplicado" } })).toBe(2);
  });
});

describe("Ingreso, bloqueo y sesiones", () => {
  beforeEach(resetDatabase);

  it("crea una sesión válida y guarda solo el hash del token", async () => {
    const user = await createUser("SECRETARY", { password: "Clave-de-prueba-123" });
    const res = await login({ email: user.email, password: "Clave-de-prueba-123" }, META);
    const stored = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.id).not.toBe(res.token);
    const session = await validateSessionToken(res.token);
    expect(session?.user.id).toBe(user.id);
    expect(await validateSessionToken("token-inventado")).toBeNull();
    const audit = await db.auditLog.findFirst({ where: { action: "auth.ingreso", actorId: user.id } });
    expect(audit).toBeTruthy();
  });

  it("responde igual ante correo inexistente o contraseña incorrecta", async () => {
    const user = await createUser("DOCTOR");
    const a = await login({ email: "nadie@prueba.local", password: "x".repeat(12) }, META).catch((e) => e);
    const b = await login({ email: user.email, password: "contraseña-incorrecta" }, META).catch((e) => e);
    expect(a.message).toBe("Correo o contraseña incorrectos.");
    expect(b.message).toBe(a.message);
  });

  it("bloquea la cuenta tras 5 intentos fallidos y registra el evento", async () => {
    const user = await createUser("ADMIN", { password: "Clave-de-prueba-123" });
    for (let i = 0; i < 4; i++) {
      await expect(login({ email: user.email, password: "mala-clave-000" }, META)).rejects.toThrow("Correo o contraseña incorrectos.");
    }
    await expect(login({ email: user.email, password: "mala-clave-000" }, META)).rejects.toBeInstanceOf(RateLimitError);
    // Incluso con la contraseña correcta, sigue bloqueada
    await expect(login({ email: user.email, password: "Clave-de-prueba-123" }, META)).rejects.toBeInstanceOf(RateLimitError);
    expect(await db.auditLog.count({ where: { action: "auth.cuenta_bloqueada", actorId: user.id } })).toBe(1);
    // Un correo sin cuenta se comporta igual (no revela qué cuentas existen).
    for (let i = 0; i < 4; i++) {
      await expect(login({ email: "nadie@prueba.local", password: "mala-clave-000" }, META)).rejects.toThrow("Correo o contraseña incorrectos.");
    }
    await expect(login({ email: "nadie@prueba.local", password: "mala-clave-000" }, META)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("no permite ingresar a cuentas desactivadas e invalida sesiones de usuarios desactivados", async () => {
    const user = await createUser("SECRETARY", { password: "Clave-de-prueba-123" });
    const res = await login({ email: user.email, password: "Clave-de-prueba-123" }, META);
    await db.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    expect(await validateSessionToken(res.token)).toBeNull();
    await expect(login({ email: user.email, password: "Clave-de-prueba-123" }, META)).rejects.toThrow(/desactivada/);
  });
});

describe("Recuperación y cambio de contraseña", () => {
  beforeEach(resetDatabase);

  it("restablece la contraseña con un enlace de un solo uso e invalida las sesiones", async () => {
    const user = await createUser("PATIENT", { password: "Clave-anterior-123" });
    const old = await login({ email: user.email, password: "Clave-anterior-123" }, META);
    await requestPasswordReset({ email: user.email }, META);
    const mail = lastEmailTo(user.email);
    expect(mail).toContain("/restablecer-contrasena?token=");
    const token = tokenFromEmail(mail!);
    // El contenido del correo de seguridad no se guarda en la base de datos
    const record = await db.outboundMessage.findFirstOrThrow({ where: { recipient: user.email, event: "PASSWORD_RESET" } });
    expect(record.body).toBeNull();
    expect(record.status).toBe("SENT");

    await resetPassword({ token, password: "Clave-nueva-2026!", passwordConfirm: "Clave-nueva-2026!" }, META);
    expect(await validateSessionToken(old.token)).toBeNull();
    await expect(login({ email: user.email, password: "Clave-anterior-123" }, META)).rejects.toThrow();
    await expect(login({ email: user.email, password: "Clave-nueva-2026!" }, META)).resolves.toBeTruthy();
    await expect(resetPassword({ token, password: "Otra-clave-2026!", passwordConfirm: "Otra-clave-2026!" }, META)).rejects.toThrow(
      /no es válido|ya fue utilizado/,
    );
  });

  it("no revela si un correo existe al solicitar recuperación", async () => {
    await expect(requestPasswordReset({ email: "inexistente@prueba.local" }, META)).resolves.toBeUndefined();
    expect(lastEmailTo("inexistente@prueba.local")).toBeNull();
  });

  it("rechaza enlaces vencidos", async () => {
    const user = await createUser("PATIENT");
    const token = await issueToken(user.id, "PASSWORD_RESET");
    await db.authToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword({ token, password: "Clave-nueva-2026!", passwordConfirm: "Clave-nueva-2026!" }, META)).rejects.toThrow(
      /venció|no es válido/,
    );
  });

  it("cambia la contraseña verificando la actual y conserva solo la sesión en uso", async () => {
    const user = await createUser("DOCTOR", { password: "Clave-actual-123" });
    const s1 = await login({ email: user.email, password: "Clave-actual-123" }, META);
    const s2 = await login({ email: user.email, password: "Clave-actual-123" }, META);
    const current = await validateSessionToken(s1.token);
    const actor = { ...(await actorFor(user.id)), sessionId: current!.sessionId };
    await expect(
      changePassword(actor, { currentPassword: "equivocada-000", password: "Clave-nueva-456!", passwordConfirm: "Clave-nueva-456!" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await changePassword(actor, { currentPassword: "Clave-actual-123", password: "Clave-nueva-456!", passwordConfirm: "Clave-nueva-456!" });
    expect(await validateSessionToken(s1.token)).not.toBeNull();
    expect(await validateSessionToken(s2.token)).toBeNull();
  });

  it("activa una cuenta invitada al crear la contraseña", async () => {
    const user = await db.user.create({ data: { email: "invitada@prueba.local", name: "Dra. Invitada", role: "DOCTOR", status: "INVITED" } });
    const token = await issueToken(user.id, "INVITATION");
    await acceptInvitation({ token, password: "Clave-invitada-789", passwordConfirm: "Clave-invitada-789" }, META);
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.status).toBe("ACTIVE");
    await expect(login({ email: user.email, password: "Clave-invitada-789" }, META)).resolves.toBeTruthy();
  });
});
