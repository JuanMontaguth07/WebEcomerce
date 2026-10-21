import { describe, expect, it } from "vitest";
import { checkoutSchema, customerSchema, normalizePhone } from "./schemas";

const valid = {
  name: "Cliente Demo",
  email: "  Cliente@Correo.CO ",
  phone: "+57 300 123-4567",
  document: "",
  department: "Antioquia",
  city: "Medellín",
  address: "Calle 10 # 20-30",
  notes: "",
  dataConsent: true,
};

describe("customerSchema", () => {
  it("normaliza correo y teléfono", () => {
    const parsed = customerSchema.parse(valid);
    expect(parsed.email).toBe("cliente@correo.co");
    expect(parsed.phone).toBe("+573001234567");
    expect(normalizePhone("(601) 555.1234")).toBe("6015551234");
  });

  it("exige autorización de datos y departamento válido", () => {
    const result = customerSchema.safeParse({ ...valid, dataConsent: false, department: "Texas" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["dataConsent", "department"]));
  });

  it("rechaza teléfonos, documentos y direcciones inválidos", () => {
    for (const patch of [
      { phone: "123" },
      { document: "1.234.567" },
      { address: "Cl" },
      { name: "A" },
    ]) {
      expect(customerSchema.safeParse({ ...valid, ...patch }).success, JSON.stringify(patch)).toBe(
        false,
      );
    }
  });
});

describe("checkoutSchema", () => {
  const items = [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }];

  it("acepta un pedido válido sin precios del cliente", () => {
    const parsed = checkoutSchema.parse({ customer: valid, items: [{ ...items[0], price: 1 }] });
    expect(parsed.items[0]).toEqual(items[0]);
  });

  it("rechaza carritos vacíos y el campo trampa con contenido", () => {
    expect(checkoutSchema.safeParse({ customer: valid, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ customer: valid, items, website: "spam" }).success).toBe(
      false,
    );
  });
});
