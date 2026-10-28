import { describe, expect, it } from "vitest";
import { detectDevice, formatLastSeen, mergePresence, presenceLabel } from "./presence";

describe("mergePresence", () => {
  const meta = { name: "Ana", initials: "A" };

  it("está en línea si alguna pestaña está activa", () => {
    expect(
      mergePresence("1", [
        { ...meta, status: "away", device: "desktop" },
        { ...meta, status: "online", device: "desktop" },
      ]),
    ).toEqual({ id: "1", ...meta, status: "online", device: "desktop", typing: false });
  });

  it("queda ausente si todas sus pestañas están en segundo plano", () => {
    expect(mergePresence("1", [{ ...meta, status: "away", device: "desktop" }])?.status).toBe(
      "away",
    );
  });

  it("muestra celular solo si no está activo en un computador", () => {
    expect(mergePresence("1", [{ ...meta, status: "online", device: "mobile" }])?.device).toBe(
      "mobile",
    );
    // Activo en el celular y con el computador en segundo plano: cuenta el celular.
    expect(
      mergePresence("1", [
        { ...meta, status: "away", device: "desktop" },
        { ...meta, status: "online", device: "mobile" },
      ])?.device,
    ).toBe("mobile");
    expect(
      mergePresence("1", [
        { ...meta, status: "online", device: "desktop" },
        { ...meta, status: "online", device: "mobile" },
      ])?.device,
    ).toBe("desktop");
  });

  it("sin pestañas no hay nadie", () => {
    expect(mergePresence("1", [])).toBeNull();
  });
});

describe("detectDevice", () => {
  const ua = {
    android:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
    iphone:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    windows:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
  };

  it("reconoce celulares y tabletas", () => {
    expect(detectDevice({ userAgent: ua.android })).toBe("mobile");
    expect(detectDevice({ userAgent: ua.iphone })).toBe("mobile");
    expect(detectDevice({ userAgent: ua.windows, userAgentData: { mobile: true } })).toBe("mobile");
    // iPadOS se presenta como Mac con pantalla táctil.
    expect(detectDevice({ userAgent: ua.mac, maxTouchPoints: 5 })).toBe("mobile");
  });

  it("los computadores son computadores", () => {
    expect(detectDevice({ userAgent: ua.windows })).toBe("desktop");
    expect(detectDevice({ userAgent: ua.mac, maxTouchPoints: 0 })).toBe("desktop");
  });
});

describe("presenceLabel", () => {
  it("dice el estado y desde dónde", () => {
    const admin = { id: "1", name: "Ana", initials: "A", status: "online" as const };
    expect(presenceLabel({ ...admin, device: "mobile" })).toBe("En línea · en el celular");
    expect(presenceLabel({ ...admin, status: "away", device: "desktop" })).toBe(
      "Ausente · en el computador",
    );
    expect(presenceLabel(undefined)).toBe("Desconectado");
  });
});

describe("formatLastSeen", () => {
  const now = Date.parse("2026-10-27T15:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("redondea a minutos, horas o días", () => {
    expect(formatLastSeen(ago(20_000), now)).toBe("Visto hace un momento");
    expect(formatLastSeen(ago(5 * 60_000), now)).toBe("Visto hace 5 min");
    expect(formatLastSeen(ago(3 * 3_600_000), now)).toBe("Visto hace 3 h");
    expect(formatLastSeen(ago(30 * 3_600_000), now)).toBe("Visto ayer");
  });

  it("después de dos días muestra la fecha en hora de Colombia", () => {
    expect(formatLastSeen("2026-10-20T02:00:00Z", now)).toBe("Visto el 19 de oct");
  });

  it("una hora levemente en el futuro (relojes desfasados) cuenta como ahora", () => {
    expect(formatLastSeen(ago(-30_000), now)).toBe("Visto hace un momento");
  });
});

describe("escribiendo en el chat", () => {
  it("se muestra si alguna pestaña del admin está escribiendo", () => {
    const base = {
      name: "Ana",
      initials: "A",
      status: "online" as const,
      device: "desktop" as const,
    };
    expect(mergePresence("1", [base, { ...base, typing: true }])?.typing).toBe(true);
    expect(mergePresence("1", [base])?.typing).toBe(false);
  });
});
