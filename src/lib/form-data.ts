// Conversión uniforme de FormData a objeto (cliente y servidor usan la misma regla).
// Los campos repetidos (casillas múltiples) se convierten en arreglos.
// Los campos cuyo nombre termina en "[]" siempre son arreglos.

export type FormObject = Record<string, string | string[] | File>;

export function formDataToObject(formData: FormData): FormObject {
  const out: FormObject = {};
  for (const [rawKey, value] of formData.entries()) {
    if (rawKey.startsWith("$ACTION")) continue;
    const isArray = rawKey.endsWith("[]");
    const key = isArray ? rawKey.slice(0, -2) : rawKey;
    const v = typeof value === "string" ? value : value;
    const existing = out[key];
    if (isArray) {
      out[key] = [...((existing as string[] | undefined) ?? []), v as string];
    } else if (existing === undefined) {
      out[key] = v;
    } else if (Array.isArray(existing)) {
      existing.push(v as string);
    } else {
      out[key] = [existing as string, v as string];
    }
  }
  return out;
}
