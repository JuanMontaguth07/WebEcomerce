import { describe, expect, it } from "vitest";
import { initials } from "@/features/account/initials";
import { ADMIN_ACCENTS, toAccent, toFont } from "./preferences";

describe("preferencias del panel", () => {
  it("vuelve a los valores por defecto ante datos desconocidos", () => {
    expect(toAccent("lime")).toBe("lime");
    expect(toAccent("toString")).toBe("orange");
    expect(toAccent(null)).toBe("orange");
    expect(toFont("figtree")).toBe("figtree");
    expect(toFont("comic")).toBe("plex");
  });

  it("todos los acentos tienen nombre y muestra", () => {
    for (const accent of Object.values(ADMIN_ACCENTS)) {
      expect(accent.swatch).toMatch(/^#[0-9A-F]{6}$/);
      expect(accent.label.length).toBeGreaterThan(2);
    }
  });
});

describe("iniciales del avatar", () => {
  it("usa nombre y apellido, o el correo si no hay nombre", () => {
    expect(initials({ fullName: "Juan Diego Montaño", email: "x@y.co" })).toBe("JD");
    expect(initials({ fullName: "  ana ", email: null })).toBe("A");
    expect(initials({ fullName: null, email: "ventas@kova.co" })).toBe("V");
    expect(initials({ fullName: null, email: null })).toBe("A");
  });
});
