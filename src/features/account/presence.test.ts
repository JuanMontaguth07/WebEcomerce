import { describe, expect, it } from "vitest";
import { formatLastSeen, mergePresence } from "./presence";

describe("mergePresence", () => {
  const meta = { name: "Ana", initials: "A" };

  it("está en línea si alguna pestaña está activa", () => {
    expect(
      mergePresence("1", [
        { ...meta, status: "away" },
        { ...meta, status: "online" },
      ]),
    ).toEqual({ id: "1", ...meta, status: "online" });
  });

  it("queda ausente si todas sus pestañas están en segundo plano", () => {
    expect(mergePresence("1", [{ ...meta, status: "away" }])?.status).toBe("away");
  });

  it("sin pestañas no hay nadie", () => {
    expect(mergePresence("1", [])).toBeNull();
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
