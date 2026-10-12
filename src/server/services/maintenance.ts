import "server-only";
import { db } from "@/server/db";
import { purgeExpiredSessions } from "@/server/auth/session";
import { purgeExpiredRateLimits } from "@/server/auth/rate-limit";
import { queueDueReminders } from "./appointment-notifications";
import { processMessageQueue } from "./messaging";

/** Tarea periódica (cada 5–15 minutos): recordatorios, cola de mensajes y limpieza. */
export async function runScheduledJobs() {
  const started = new Date();
  const reminders = await queueDueReminders(started);
  const queue = await processMessageQueue(50);
  await purgeExpiredSessions();
  await purgeExpiredRateLimits();
  await db.authToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(Date.now() - 7 * 86400_000) } }, { usedAt: { lt: new Date(Date.now() - 30 * 86400_000) } }] } });
  const result = { at: started.toISOString(), reminders, ...queue, durationMs: Date.now() - started.getTime() };
  await db.systemSetting.upsert({ where: { key: "cron.lastRun" }, create: { key: "cron.lastRun", value: result }, update: { value: result } });
  return result;
}

export async function lastCronRun(): Promise<{ at: string; reminders: number; sent: number; failed: number } | null> {
  const row = await db.systemSetting.findUnique({ where: { key: "cron.lastRun" } });
  return (row?.value as { at: string; reminders: number; sent: number; failed: number } | undefined) ?? null;
}
