import "server-only";
import { db } from "@/server/db";
import { RateLimitError } from "@/server/errors";

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: Date };

/**
 * Ventana fija atómica en PostgreSQL. Funciona con varias instancias de la
 * aplicación porque el contador vive en la base de datos.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "rate_limits" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."resetAt" <= now() THEN 1 ELSE "rate_limits"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limits"."resetAt" <= now()
                       THEN now() + make_interval(secs => ${windowSeconds})
                       ELSE "rate_limits"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt: row.resetAt };
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const result = await consumeRateLimit(key, limit, windowSeconds);
  if (!result.allowed) throw new RateLimitError(message);
  return result;
}

export async function resetRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

export async function purgeExpiredRateLimits() {
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
