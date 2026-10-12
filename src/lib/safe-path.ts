const BASE = "http://cmio.invalid";

/**
 * Devuelve una ruta interna segura para redirigir después de ingresar, o null.
 * Rechaza URLs absolutas, rutas de protocolo relativo (//, /\), caracteres de control y
 * espacios (los navegadores los eliminan y pueden convertir "/\t/sitio" en "//sitio").
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || value.length > 300 || !value.startsWith("/")) return null;
  if (/[\u0000- \u007f\\]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith("//") ? null : path;
}
