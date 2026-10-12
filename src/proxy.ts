import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-cmio_sesion" : "cmio_sesion";
const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    // Mapas interactivos (se cargan solo cuando la persona los solicita).
    "frame-src https://www.google.com https://maps.google.com https://www.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-cmio-path", request.nextUrl.pathname + request.nextUrl.search);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // La vigencia real de la sesión la controla la base de datos (renovación deslizante).
  // En navegaciones GET se extiende la cookie para que no expire antes que la sesión.
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (request.method === "GET" && session) {
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|images/|favicon.ico|icon.svg|robots.txt|sitemap.xml|api/cron|api/salud).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
