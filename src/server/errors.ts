// Errores de dominio con mensajes en español listos para mostrar al usuario.

export type FieldErrors = Record<string, string[] | undefined>;

export class AppError extends Error {
  readonly code: string;
  readonly fieldErrors?: FieldErrors;
  constructor(message: string, code = "APP_ERROR", fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Revisa los datos marcados en el formulario.", fieldErrors?: FieldErrors) {
    super(message, "VALIDATION", fieldErrors);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Tu sesión expiró. Ingresa nuevamente para continuar.") {
    super(message, "UNAUTHENTICATED");
    this.name = "UnauthenticatedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontramos el registro solicitado.") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Realizaste demasiados intentos. Espera unos minutos y vuelve a intentarlo.") {
    super(message, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

/** Detecta errores de PostgreSQL por código SQLSTATE a través del adaptador de Prisma. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    const c = current as { code?: unknown; cause?: unknown; meta?: { code?: unknown; driverAdapterError?: unknown } };
    if (typeof c.code === "string" && /^[0-9A-Z]{5}$/.test(c.code)) return c.code;
    if (c.meta && typeof c.meta.code === "string" && /^[0-9A-Z]{5}$/.test(c.meta.code)) return c.meta.code;
    current = c.cause ?? c.meta?.driverAdapterError;
  }
  const text = String((error as Error)?.message ?? "");
  if (text.includes("23P01") || text.includes("exclusion constraint")) return "23P01";
  if (text.includes("CMIO_")) return "P0001";
  return undefined;
}

export function errorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    const c = current as { message?: unknown; cause?: unknown; meta?: { driverAdapterError?: unknown } };
    if (typeof c.message === "string") parts.push(c.message);
    current = c.cause ?? c.meta?.driverAdapterError;
  }
  return parts.join(" | ");
}

export function isExclusionViolation(error: unknown) {
  return pgErrorCode(error) === "23P01" || errorText(error).includes("23P01") || /exclusion constraint|no_overlap/i.test(errorText(error));
}

export function isUniqueViolation(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === "P2002" || pgErrorCode(error) === "23505";
}

/**
 * Resumen de un error apto para registros del servidor. Los errores de Prisma pueden incluir
 * valores de la consulta (datos personales o clínicos), por lo que solo se registra su tipo y código.
 */
export function safeErrorSummary(error: unknown): string {
  const err = error as { name?: unknown; code?: unknown; message?: unknown } | null;
  const name = typeof err?.name === "string" ? err.name : "Error";
  const code = typeof err?.code === "string" ? ` ${err.code}` : "";
  if (name.startsWith("PrismaClient")) return `${name}${code} (detalle omitido)`;
  const message = typeof err?.message === "string" ? `: ${err.message.slice(0, 300)}` : "";
  return `${name}${code}${message}`;
}
