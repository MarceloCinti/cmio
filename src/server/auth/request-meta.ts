import "server-only";
import { headers } from "next/headers";

export type RequestMeta = { ip: string; userAgent: string | null };

export async function getRequestMeta(): Promise<RequestMeta> {
  try {
    const h = await headers();
    const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
    let ip = "desconocida";
    if (trustProxy) {
      const forwarded = h.get("x-forwarded-for");
      ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || ip;
    } else {
      ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || ip;
    }
    const ua = h.get("user-agent");
    return { ip: ip.slice(0, 64), userAgent: ua ? ua.slice(0, 256) : null };
  } catch {
    // Fuera de una solicitud (scripts, pruebas)
    return { ip: "local", userAgent: null };
  }
}
