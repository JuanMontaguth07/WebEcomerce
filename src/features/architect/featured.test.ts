import { describe, expect, it } from "vitest";
import { buildCodeFrom } from "./featured";
import { countdown } from "./featured";

describe("enlace de una configuración", () => {
  it("saca el código del enlace de compartir o del código solo", () => {
    expect(buildCodeFrom("https://kovastudio-sigma.vercel.app/arma-tu-pc/Ab3dEf6hJk9m")).toBe(
      "Ab3dEf6hJk9m",
    );
    expect(buildCodeFrom("  Ab3dEf6hJk9m ")).toBe("Ab3dEf6hJk9m");
    expect(buildCodeFrom("/arma-tu-pc/Ab3dEf6hJk9m?x=1")).toBe("Ab3dEf6hJk9m");
    expect(buildCodeFrom("https://otra.com/algo/Ab3dEf6hJk9mXX")).toBeNull();
    expect(buildCodeFrom("hola")).toBeNull();
  });
});

describe("PC de la semana", () => {
  it("cuenta lo que falta y se apaga al llegar a cero", () => {
    const now = Date.parse("2026-11-03T10:00:00Z");
    expect(countdown("2026-11-05T12:30:15Z", now)).toEqual({
      days: 2,
      hours: 2,
      minutes: 30,
      seconds: 15,
    });
    expect(countdown("2026-11-03T10:00:00Z", now)).toBeNull();
    expect(countdown("no es fecha", now)).toBeNull();
  });
});
