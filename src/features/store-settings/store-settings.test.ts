import { describe, expect, it } from "vitest";
import { shippingRateSchema } from "@/features/shipping/schemas";
import { deliveryLabel } from "@/features/shipping/types";
import { storeSettingsSchema } from "./schemas";
import { formatNit, formatPhone, whatsappLink } from "./types";

const settings = {
  whatsappNumber: "",
  supportEmail: "",
  supportHours: "",
  legalName: "",
  legalNit: "",
  legalDv: "",
  legalAddress: "",
  legalCity: "",
  nequiNumber: "",
  nequiHolder: "",
  announcementText: "",
  announcementHref: "",
  announcementEnabled: false,
};

describe("configuración de la tienda", () => {
  it("normaliza el WhatsApp a formato internacional", () => {
    for (const input of ["300 123 4567", "+57 300-123-4567", "573001234567"]) {
      expect(storeSettingsSchema.parse({ ...settings, whatsappNumber: input }).whatsappNumber).toBe(
        "573001234567",
      );
    }
  });

  it("normaliza el Nequi a 10 dígitos y rechaza fijos", () => {
    for (const input of ["300 123 4567", "+57 300 123 4567"]) {
      expect(storeSettingsSchema.parse({ ...settings, nequiNumber: input }).nequiNumber).toBe(
        "3001234567",
      );
    }
    expect(
      storeSettingsSchema.safeParse({ ...settings, nequiNumber: "601 234 5678" }).success,
    ).toBe(false);
  });

  it("convierte los campos vacíos en null", () => {
    expect(storeSettingsSchema.parse(settings)).toEqual({
      whatsappNumber: null,
      supportEmail: null,
      supportHours: null,
      legalName: null,
      legalNit: null,
      legalDv: null,
      legalAddress: null,
      legalCity: null,
      nequiNumber: null,
      nequiHolder: null,
      announcementText: null,
      announcementHref: null,
      announcementEnabled: false,
      usdCopRate: null,
    });
  });

  it("el anuncio solo enlaza dentro de la tienda y encendido exige texto", () => {
    const parse = (overrides: Partial<typeof settings>) =>
      storeSettingsSchema.safeParse({
        ...settings,
        announcementText: "Envío gratis",
        ...overrides,
      });
    expect(parse({ announcementHref: "/productos?oferta=1" }).success).toBe(true);
    expect(parse({ announcementHref: "/" }).success).toBe(true);
    for (const href of [
      "https://otro.sitio",
      "//otro.sitio",
      "/\\otro.sitio",
      "productos",
      "/a b",
    ]) {
      expect(parse({ announcementHref: href }).success, href).toBe(false);
    }
    expect(storeSettingsSchema.safeParse({ ...settings, announcementEnabled: true }).success).toBe(
      false,
    );
  });

  it("rechaza NIT con dígito de verificación pegado, DV largo y teléfonos cortos", () => {
    const result = storeSettingsSchema.safeParse({
      ...settings,
      legalNit: "1234567890-6",
      legalDv: "12",
      whatsappNumber: "12345",
    });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["legalNit", "legalDv", "whatsappNumber"]));
  });

  it("acepta el NIT con puntos y lo guarda solo con números", () => {
    expect(storeSettingsSchema.parse({ ...settings, legalNit: "1.234.567.890" }).legalNit).toBe(
      "1234567890",
    );
  });

  it("formatea NIT, teléfono y enlace de WhatsApp", () => {
    expect(formatNit({ legalNit: "1234567890", legalDv: "6" })).toBe("1234567890-6");
    expect(formatNit({ legalNit: null, legalDv: "6" })).toBeNull();
    expect(formatPhone("573001234567")).toBe("300 123 4567");
    expect(whatsappLink("573001234567", "Hola, ¿tienen stock?")).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20%C2%BFtienen%20stock%3F",
    );
  });
});

describe("tarifas de envío", () => {
  const rate = {
    department: "Antioquia",
    city: "",
    price: "15000",
    minDays: "",
    maxDays: "",
    isActive: true,
  };

  it("una ciudad vacía es la tarifa del departamento y los días son opcionales", () => {
    expect(shippingRateSchema.parse(rate)).toMatchObject({
      city: null,
      price: 15000,
      minDays: null,
      maxDays: null,
    });
  });

  it("rechaza departamentos inexistentes y días invertidos", () => {
    expect(shippingRateSchema.safeParse({ ...rate, department: "Texas" }).success).toBe(false);
    const result = shippingRateSchema.safeParse({ ...rate, minDays: "5", maxDays: "2" });
    expect(result.error?.issues[0]?.path).toEqual(["maxDays"]);
  });

  it("describe el tiempo de entrega", () => {
    expect(deliveryLabel({ minDays: 1, maxDays: 3 })).toBe("1 a 3 días hábiles");
    expect(deliveryLabel({ minDays: 1, maxDays: 1 })).toBe("1 día hábil");
    expect(deliveryLabel({ minDays: null, maxDays: 4 })).toBe("4 días hábiles");
    expect(deliveryLabel({ minDays: null, maxDays: null })).toBeNull();
  });
});

describe("tasa del dólar", () => {
  const base = {
    whatsappNumber: "",
    supportEmail: "",
    supportHours: "",
    legalName: "",
    legalNit: "",
    legalDv: "",
    legalAddress: "",
    legalCity: "",
    nequiNumber: "",
    nequiHolder: "",
    announcementText: "",
    announcementHref: "",
    announcementEnabled: false,
  };

  it("acepta «4.150» y rechaza valores fuera de rango", () => {
    expect(storeSettingsSchema.parse({ ...base, usdCopRate: "4.150" }).usdCopRate).toBe(4150);
    expect(storeSettingsSchema.safeParse({ ...base, usdCopRate: "41" }).success).toBe(false);
  });
});
