import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Parámetros Argon2id recomendados por OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Hash ficticio para igualar tiempos cuando el usuario no existe (evita enumeración).
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("cmio-contrasena-ficticia-para-tiempos");
  await verifyPassword(await dummyHash, password);
}
