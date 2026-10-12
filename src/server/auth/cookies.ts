import "server-only";
import { cookies } from "next/headers";

const secure = process.env.NODE_ENV === "production";
// En producción se usa el prefijo __Host- (exige Secure, Path=/ y sin Domain).
export const SESSION_COOKIE = secure ? "__Host-cmio_sesion" : "cmio_sesion";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
