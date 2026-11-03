import { describe, expect, it } from "vitest";
import {
  adminOrderEmail,
  escapeHtml,
  orderReceivedEmail,
  orderStatusEmail,
  receiptRejectedEmail,
  type EmailOrder,
  type EmailStore,
} from "./templates";

const store: EmailStore = {
  name: "Kova Studio",
  siteUrl: "https://kova.test/",
  whatsappNumber: "573001234567",
  supportEmail: "hola@kova.test",
  nequiNumber: "3001234567",
  nequiHolder: "Kova",
};

const order: EmailOrder = {
  orderNumber: 1042,
  customerName: "Laura <script>alert(1)</script> Gómez",
  city: "Bogotá",
  department: "Cundinamarca",
  address: "Calle 1 # 2-3",
  subtotal: 1_500_000,
  shippingCost: null,
  total: 1_500_000,
  items: [{ productName: "RTX 5060 Ti & más", quantity: 1, subtotal: 1_500_000 }],
};

describe("correos de la tienda", () => {
  it("escapa lo que escribió el cliente", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
    const email = orderReceivedEmail(order, store, "https://kova.test/pedido/1?t=abc");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("RTX 5060 Ti &amp; más");
  });

  it("pedido recibido: resumen, cómo pagar por Nequi y el enlace", () => {
    const email = orderReceivedEmail(order, store, "https://kova.test/pedido/1?t=abc");
    expect(email.subject).toBe("Recibimos tu pedido #1042");
    expect(email.text).toContain("Nequi al 3001234567 (Kova)");
    expect(email.text).toContain("Envío: Por confirmar");
    expect(email.text).toContain("https://kova.test/pedido/1?t=abc");
    expect(email.html).toContain('href="https://kova.test/pedido/1?t=abc"');
    // Sin Nequi configurado no se inventan datos de pago.
    const plain = orderReceivedEmail(order, { ...store, nequiNumber: null }, "https://x");
    expect(plain.text).not.toContain("Nequi");
    expect(plain.text).toContain("Te contactaremos para confirmar el pago");
  });

  it("cambios de estado con su texto y la nota del admin", () => {
    expect(orderStatusEmail(order, "confirmed", store).subject).toBe("Confirmamos tu pedido #1042");
    expect(orderStatusEmail(order, "shipped", store).text).toContain("va en camino");
    const cancelled = orderStatusEmail(order, "cancelled", store, "Sin stock del proveedor");
    expect(cancelled.subject).toBe("Cancelamos tu pedido #1042");
    expect(cancelled.text).toContain("Nota: Sin stock del proveedor");
    expect(cancelled.text).not.toMatch(/\n\n\n/);
  });

  it("comprobante rechazado con el motivo; avisos a los admins con el enlace al panel", () => {
    expect(receiptRejectedEmail(order, "El valor no coincide", store).text).toContain(
      "Motivo: El valor no coincide",
    );
    const admin = adminOrderEmail("order", order, store, "https://kova.test/admin/pedidos/1");
    expect(admin.subject).toMatch(/^Pedido nuevo #1042 · \$/);
    expect(admin.text).toContain("hizo un pedido desde Bogotá");
    expect(admin.text).toContain("https://kova.test/admin/pedidos/1");
    expect(adminOrderEmail("receipt", order, store, "https://x").subject).toBe(
      "Comprobante de pago · pedido #1042",
    );
  });
});
