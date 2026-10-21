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
    expect(signInSchema.parse({ email: " Admin@Tienda.CO ", password: "x" }).email).toBe(
      "admin@tienda.co",
    );
  });
});

describe("newPasswordSchema", () => {
  it("exige la política de contraseñas y que coincidan", async () => {
    const { newPasswordSchema } = await import("./schemas");
    expect(
      newPasswordSchema.safeParse({ password: "Segura2026x", confirm: "Segura2026x" }).success,
    ).toBe(true);
    for (const password of ["corta1A", "sinmayusculas123", "SINMINUSCULAS123", "SinNumerosAqui"]) {
      expect(newPasswordSchema.safeParse({ password, confirm: password }).success, password).toBe(
        false,
      );
    }
    expect(
      newPasswordSchema.safeParse({ password: "Segura2026x", confirm: "Otra2026xx" }).success,
    ).toBe(false);
  });
});
