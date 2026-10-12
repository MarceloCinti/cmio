import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ZodType } from "zod";
import { z } from "@/lib/validation/zod-es";
import type { ActionState } from "@/lib/action-state";
import { formDataToObject } from "@/lib/form-data";
import { AppError, ValidationError } from "./errors";

/** Valida datos con un esquema y lanza ValidationError con mensajes por campo. */
export function parseInput<S extends ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
    const message = flat.formErrors[0] ?? "Revisa los datos marcados en el formulario.";
    throw new ValidationError(message, fieldErrors);
  }
  return result.data;
}

export function parseForm<S extends ZodType>(schema: S, formData: FormData): z.output<S> {
  return parseInput(schema, formDataToObject(formData));
}

/**
 * Ejecuta una acción del servidor y traduce los errores a un estado para la interfaz.
 * Los errores inesperados se registran sin datos sensibles y se informa un mensaje genérico.
 */
export async function runAction<T>(fn: () => Promise<T | void>, successMessage?: string): Promise<ActionState<T>> {
  try {
    const data = await fn();
    return { ok: true, message: successMessage, data: data ?? undefined, at: Date.now() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      return { ok: false, message: error.message, fieldErrors: error.fieldErrors, at: Date.now() };
    }
    const err = error as Error;
    console.error("[cmio] Error inesperado en acción:", err?.name, err?.message?.slice(0, 300));
    return {
      ok: false,
      message: "Ocurrió un error inesperado. Intenta nuevamente en unos minutos; si el problema continúa, comunícate con la clínica.",
      at: Date.now(),
    };
  }
}
