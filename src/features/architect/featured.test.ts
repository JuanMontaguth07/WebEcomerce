import { describe, expect, it } from "vitest";
import { buildCodeFrom } from "./featured";

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
