// Cliente de base de datos para scripts (semillas, mantenimiento). No usar en la app.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

export function createScriptClient() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
