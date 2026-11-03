import { describe, expect, it } from "vitest";
import { suggestedName } from "./types";

describe("nombre que se sugiere mostrar", () => {
  it("nombre y la inicial del apellido, sin el apellido completo", () => {
    expect(suggestedName("laura martínez gómez")).toBe("Laura M.");
    expect(suggestedName("  Andrés  ")).toBe("Andrés");
    expect(suggestedName("Óscar ñustes")).toBe("Óscar Ñ.");
  });
});
