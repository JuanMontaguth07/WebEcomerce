import { describe, expect, it } from "vitest";
import { RULES } from "./rules";
import { ARCHITECT_TEMPLATES, architectKeys, missingTemplateSpecs } from "./template";
import { PART_KINDS, type Build, type PartKind, type PartSpecs } from "./types";

/** Ficha que responde a cualquier clave y anota cuáles se leyeron. */
function recordingSpecs(kind: PartKind, read: Map<PartKind, Set<string>>): PartSpecs {
  return new Proxy({} as PartSpecs, {
    get(_, key) {
      if (typeof key !== "string") return undefined;
      read.get(kind)?.add(key);
      // Valores que hacen avanzar cada regla hasta su última comprobación.
      if (key === "cooling_type") return "Líquida AIO";
      if (key === "interface") return "NVMe";
      return "1";
    },
  });
}

describe("plantilla de Kova Architect", () => {
  it("incluye todas las claves que leen las reglas, marcadas como Architect", () => {
    const read = new Map(PART_KINDS.map((kind) => [kind, new Set<string>()]));
    const part = (kind: PartKind) => ({ name: kind, specs: recordingSpecs(kind, read) });
    const build: Build = {
      cpu: part("cpu"),
      motherboard: part("motherboard"),
      gpu: part("gpu"),
      ram: part("ram"),
      storage: [part("storage")],
      psu: part("psu"),
      cooler: part("cooler"),
      case: part("case"),
    };
    for (const rule of RULES) rule(build);

    for (const kind of PART_KINDS) {
      const keys = architectKeys(kind);
      for (const key of read.get(kind) ?? []) {
        expect(keys.has(key), `${kind}.${key} falta en la plantilla`).toBe(true);
      }
    }
  });

  it("no repite claves dentro de una pieza", () => {
    for (const [kind, specs] of Object.entries(ARCHITECT_TEMPLATES)) {
      const keys = specs.map((item) => item.key);
      expect(new Set(keys).size, kind).toBe(keys.length);
    }
  });

  it("solo agrega lo que falta, a continuación de lo que ya hay", () => {
    const missing = missingTemplateSpecs("gpu", [
      { key: "vram", position: 1 },
      { key: "length", position: 7 },
    ]);
    expect(missing.map((item) => item.key)).not.toContain("vram");
    expect(missing.map((item) => item.key)).not.toContain("length");
    expect(missing[0]?.position).toBe(8);
    expect(missing.map((item) => item.position)).toEqual(missing.map((_, index) => 8 + index));
  });
});
