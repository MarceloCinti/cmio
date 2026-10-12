import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-path";

describe("Redirección después de ingresar", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/portal")).toBe("/portal");
    expect(safeNextPath("/panel/pacientes?q=ana")).toBe("/panel/pacientes?q=ana");
  });

  it("rechaza destinos externos o ambiguos", () => {
    for (const v of [
      "https://sitio-malicioso.example",
      "//sitio-malicioso.example",
      "/\\sitio-malicioso.example",
      "/\t/sitio-malicioso.example",
      "/\n/sitio-malicioso.example",
      "/ /sitio-malicioso.example",
      "portal",
      "",
      null,
      `/${"a".repeat(400)}`,
    ]) {
      expect(safeNextPath(v), String(v)).toBeNull();
    }
  });
});
