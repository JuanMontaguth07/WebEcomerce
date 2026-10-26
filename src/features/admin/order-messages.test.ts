import { describe, expect, it } from "vitest";
import { customerMessages, customerWhatsapp } from "./order-messages";

const order = {
  orderNumber: 1008,
  status: "pending" as const,
  customerName: "  Laura Gómez ",
  city: "Medellín",
  subtotal: 100000,
  shippingCost: 15000,
  total: 115000,
};
const nequi = { nequiNumber: "3001234567", nequiHolder: "Kova Studio" };

const keys = (messages: { key: string }[]) => messages.map((message) => message.key);

describe("customerMessages", () => {
  it("pendiente con envío: datos de pago por Nequi", () => {
    const messages = customerMessages(order, nequi);
    expect(keys(messages)).toEqual(["payment", "shipping-value"]);
    expect(messages[0]?.text).toContain("Hola Laura");
    expect(messages[0]?.text).toContain("300 123 4567 a nombre de Kova Studio");
    expect(messages[0]?.text).toMatch(/\$\s?115\.000/);
  });

  it("pendiente sin envío: primero avisa que falta el valor", () => {
    const messages = customerMessages({ ...order, shippingCost: null, total: 100000 }, nequi);
    expect(keys(messages)).toEqual(["shipping-pending"]);
  });

  it("sin Nequi configurado no ofrece datos de pago", () => {
    expect(keys(customerMessages(order, { nequiNumber: null, nequiHolder: null }))).toEqual([
      "shipping-value",
    ]);
  });

  it("ofrece el mensaje de cada etapa", () => {
    expect(keys(customerMessages({ ...order, status: "confirmed" }, nequi))).toEqual([
      "shipping-value",
      "paid",
    ]);
    expect(keys(customerMessages({ ...order, status: "shipped" }, nequi))).toEqual(["shipped"]);
    expect(keys(customerMessages({ ...order, status: "delivered" }, nequi))).toEqual(["thanks"]);
    expect(customerMessages({ ...order, status: "cancelled" }, nequi)).toEqual([]);
  });
});

describe("customerWhatsapp", () => {
  it("agrega el indicativo a celulares colombianos", () => {
    expect(customerWhatsapp("300 123 4567")).toBe("573001234567");
    expect(customerWhatsapp("+573001234567")).toBe("573001234567");
    expect(customerWhatsapp("+1 415 555 0100")).toBe("14155550100");
  });
});
