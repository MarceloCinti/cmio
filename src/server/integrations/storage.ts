import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/server/env";
import { ValidationError } from "@/server/errors";

// Almacenamiento de archivos fuera de la carpeta pública. Los archivos clínicos solo se
// entregan a través de rutas que verifican permisos (nunca con enlaces públicos).

export type StoredFile = { key: string; sha256: string; sizeBytes: number; mimeType: string };

const KEY_PATTERN = /^(clinical|media)\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(pdf|jpg|png|webp)$/;

export const ALLOWED_TYPES = {
  "application/pdf": { ext: "pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  "image/jpeg": { ext: "jpg", magic: [[0xff, 0xd8, 0xff]] },
  "image/png": { ext: "png", magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  "image/webp": { ext: "webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
} as const;

export type AllowedMime = keyof typeof ALLOWED_TYPES;

/** Detecta el tipo real del archivo por su contenido (no por la extensión declarada). */
export function detectMime(buf: Buffer): AllowedMime | null {
  for (const [mime, def] of Object.entries(ALLOWED_TYPES) as [AllowedMime, (typeof ALLOWED_TYPES)[AllowedMime]][]) {
    if (def.magic.some((sig) => sig.every((b, i) => buf[i] === b))) {
      if (mime === "image/webp" && buf.subarray(8, 12).toString("ascii") !== "WEBP") continue;
      return mime;
    }
  }
  return null;
}

function root() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env().STORAGE_LOCAL_PATH);
}

function resolveKey(key: string) {
  if (!KEY_PATTERN.test(key)) throw new Error("Clave de almacenamiento inválida");
  const full = path.resolve(/* turbopackIgnore: true */ root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Ruta fuera del almacenamiento");
  return full;
}

export async function validateUpload(
  file: File | null | undefined,
  opts: { maxBytes: number; allowed: AllowedMime[] },
): Promise<{ buffer: Buffer; mime: AllowedMime }> {
  if (!file || typeof file === "string" || file.size === 0) {
    throw new ValidationError("Selecciona un archivo.", { file: ["Selecciona un archivo."] });
  }
  if (file.size > opts.maxBytes) {
    const mb = Math.round(opts.maxBytes / 1024 / 1024);
    throw new ValidationError(`El archivo supera el tamaño máximo de ${mb} MB.`, { file: [`El archivo supera el tamaño máximo de ${mb} MB.`] });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(buffer);
  if (!mime || !opts.allowed.includes(mime)) {
    const names = opts.allowed.map((m) => ALLOWED_TYPES[m].ext.toUpperCase()).join(", ");
    throw new ValidationError(`Formato no admitido. Usa archivos ${names}.`, { file: [`Formato no admitido. Usa archivos ${names}.`] });
  }
  return { buffer, mime };
}

export async function storeFile(area: "clinical" | "media", buffer: Buffer, mime: AllowedMime): Promise<StoredFile> {
  const now = new Date();
  const key = `${area}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(16).toString("hex")}.${ALLOWED_TYPES[mime].ext}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, buffer, { mode: 0o600, flag: "wx" });
  return { key, sha256: createHash("sha256").update(buffer).digest("hex"), sizeBytes: buffer.length, mimeType: mime };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function storedFileExists(key: string) {
  try {
    await stat(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

export function storageStatus() {
  return { driver: env().STORAGE_DRIVER, detail: `Disco local privado (${env().STORAGE_LOCAL_PATH}). Incluir en las copias de seguridad.` };
}
