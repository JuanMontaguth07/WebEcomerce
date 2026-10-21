import { describe, expect, it } from "vitest";
import { safeNextPath } from "./paths";
import { signInSchema } from "./schemas";

describe("safeNextPath", () => {
  it("acepta rutas internas del panel", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/admin/productos")).toBe("/admin/productos");
    expect(safeNextPath("/admin/pedidos?estado=pending")).toBe("/admin/pedidos?estado=pending");
  });

  it("rechaza redirecciones abiertas y rutas fuera del panel", () => {
    for (const value of [
      "//evil.com",
      "https://evil.com",
      "/admin//evil.com",
      "/\\evil.com",
      "/adminx",
      "/productos",
      "javascript:alert(1)",
      "/admin/<script>",
      null,
      undefined,
      42,
    ]) {
      expect(safeNextPath(value)).toBe("/admin");
    }
  });
});

describe("signInSchema", () => {
  it("valida correo y contraseña", () => {
    expect(signInSchema.safeParse({ email: "admin@tienda.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "no-es-correo", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "admin@tienda.co", password: "" }).success).toBe(false);
  });
});
