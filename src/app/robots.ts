import type { MetadataRoute } from "next";
import { connection } from "next/server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Usa APP_URL del entorno de ejecución (no el del momento de compilar).
  await connection();
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/portal", "/panel", "/api", "/vista-previa", "/ingresar", "/registro", "/verificar"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
