import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "@/server/auth/request-meta";

const h = (xff: string | null) => ({ get: (n: string) => (n === "x-forwarded-for" ? xff : null) });

describe("IP de origen", () => {
  it("sin proxy de confianza no usa cabeceras que el cliente puede falsificar", () => {
    expect(clientIpFromHeaders(h("203.0.113.5"), { TRUST_PROXY: "false" })).toBe("sin-proxy");
  });

  it("con proxy de confianza usa la dirección agregada por el proxy (la última)", () => {
    const env = { TRUST_PROXY: "true" };
    // El cliente intenta suplantar 1.1.1.1; el proxy agrega la dirección real al final.
    expect(clientIpFromHeaders(h("1.1.1.1, 203.0.113.5"), env)).toBe("203.0.113.5");
    expect(clientIpFromHeaders(h("203.0.113.5"), env)).toBe("203.0.113.5");
    expect(clientIpFromHeaders(h(null), env)).toBe("desconocida");
    expect(clientIpFromHeaders(h("1.1.1.1, 203.0.113.5, 10.0.0.2"), { ...env, TRUST_PROXY_HOPS: "2" })).toBe("203.0.113.5");
  });
});
