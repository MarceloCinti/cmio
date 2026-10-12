import "server-only";
import { headers } from "next/headers";

export type RequestMeta = { ip: string; userAgent: string | null };

/**
 * IP de origen para límites de intentos y auditoría.
 *
 * - Con TRUST_PROXY=true (producción detrás de Nginx/Caddy): se toma la dirección que agregó
 *   el proxy de confianza, es decir, la última de X-Forwarded-For (o la N-ésima desde el final
 *   con TRUST_PROXY_HOPS=N si hay varios proxies propios). Las entradas anteriores las puede
 *   escribir el cliente y nunca se usan.
 * - Sin proxy de confianza no hay forma fiable de conocer la IP desde la aplicación (el cliente
 *   puede enviar X-Forwarded-For), por lo que todas las solicitudes comparten el valor
 *   "sin-proxy". Úsalo solo en desarrollo.
 */
export function clientIpFromHeaders(h: { get(name: string): string | null }, env: Record<string, string | undefined> = process.env): string {
  const trustProxy = env.TRUST_PROXY === "true" || env.TRUST_PROXY === "1";
  if (!trustProxy) return "sin-proxy";
  const hops = Math.max(1, Math.min(5, Number.parseInt(env.TRUST_PROXY_HOPS ?? "1", 10) || 1));
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = chain.length >= hops ? chain[chain.length - hops] : null;
  return (ip ?? "desconocida").slice(0, 64);
}

export async function getRequestMeta(): Promise<RequestMeta> {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    return { ip: clientIpFromHeaders(h), userAgent: ua ? ua.slice(0, 256) : null };
  } catch {
    // Fuera de una solicitud (scripts, pruebas)
    return { ip: "local", userAgent: null };
  }
}
