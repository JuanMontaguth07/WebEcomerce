import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, failure, fieldErrors, toAppError } from "./errors";

describe("toAppError", () => {
  it("traduce códigos lanzados por funciones de PostgreSQL", () => {
    const error = toAppError({
      code: "P0001",
      message: "OUT_OF_STOCK",
      details: '[{"product_id":"abc","available":1}]',
    });
    expect(error.code).toBe("OUT_OF_STOCK");
    expect(error.details).toEqual([{ product_id: "abc", available: 1 }]);
  });

  it("traduce errores de permisos y unicidad", () => {
    expect(toAppError({ code: "42501", message: "permission denied" }).code).toBe("FORBIDDEN");
    expect(toAppError({ code: "23505", message: "duplicate key" }).code).toBe("CONFLICT");
  });

  it("no filtra mensajes internos desconocidos", () => {
    const error = toAppError(new Error("connection string postgres://secret"));
    expect(error.code).toBe("INTERNAL");
    expect(error.message).not.toContain("secret");
  });
});

describe("fieldErrors", () => {
  it("reporta los campos anidados con el nombre que usa el formulario", () => {
    const schema = z.object({
      id: z.uuid(),
      values: z.object({ price: z.number(), name: z.string().min(2, "Muy corto") }),
    });
    const parsed = schema.safeParse({ id: "x", values: { price: "a", name: "A" } });
    expect(parsed.success).toBe(false);
    const errors = fieldErrors(parsed.error!);
    expect(Object.keys(errors).sort()).toEqual(["id", "name", "price"]);
    expect(errors.name).toEqual(["Muy corto"]);
  });
});

describe("failure", () => {
  it("incluye errores por campo solo en validaciones", () => {
    const result = failure(new AppError("VALIDATION", { details: { email: ["Correo inválido"] } }));
    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: expect.any(String),
        fieldErrors: { email: ["Correo inválido"] },
      },
    });
  });
});
