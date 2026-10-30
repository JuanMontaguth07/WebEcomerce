import { describe, expect, it } from "vitest";
import type { Build } from "@/features/compatibility/types";
import { buildStats, INTEGRATED_GPU_SCORE } from "./stats";

const part = (specs: Record<string, string | number | boolean>) => ({ name: "x", specs });

describe("estadísticas del equipo", () => {
  it("estima juegos y trabajo, y dice para qué alcanza", () => {
    const stats = buildStats(
      {
        cpu: part({ perf_score: 63, tdp: 120 }),
        gpu: part({ perf_score: 54, tdp: 250 }),
        psu: part({ wattage: 750 }),
        ram: part({ capacity: 32 }),
        storage: [part({ capacity: 1000 })],
      } satisfies Build,
      5_000_000,
    );
    expect(stats.performance).toEqual({ gaming: 56, work: 61 });
    expect(stats.tier?.label).toBe("1440p alto");
    expect(stats.balance?.kind).toBe("balanced");
    expect(stats.power).toEqual({ estimate: 445, psu: 750, headroom: 305 / 750, level: "ok" });
    expect(stats.value).toBe(11.2);
    expect(stats.notes).toEqual([]);
  });

  it("detecta cuando el procesador limita a la gráfica (y lo refleja en juegos)", () => {
    const stats = buildStats({ cpu: part({ perf_score: 40 }), gpu: part({ perf_score: 90 }) }, 0);
    expect(stats.balance?.kind).toBe("cpu-limits");
    // Sin el límite serían ~80; el procesador lo baja.
    expect(stats.performance?.gaming).toBe(50);
    expect(stats.value).toBeNull();
  });

  it("sin gráfica usa la integrada y avisa", () => {
    const stats = buildStats(
      { cpu: part({ perf_score: 44, integrated_graphics: true }), storage: [part({})] },
      2_000_000,
    );
    expect(stats.integratedGraphics).toBe(true);
    expect(stats.balance).toBeNull();
    expect(stats.performance?.gaming).toBeLessThan(15);
    expect(stats.tier?.label).toBe("Oficina y estudio");
    expect(stats.notes[0]).toMatch(/Sin gráfica dedicada/);
    expect(INTEGRATED_GPU_SCORE).toBeGreaterThan(0);
  });

  it("no adivina: sin puntaje no estima, y avisa lo que falta", () => {
    const stats = buildStats(
      {
        cpu: part({ tdp: 65 }),
        gpu: part({ perf_score: 50, tdp: 200 }),
        ram: part({ capacity: 8 }),
      },
      3_000_000,
    );
    expect(stats.performance).toBeNull();
    expect(stats.tier).toBeNull();
    expect(stats.missingScore).toEqual(["cpu"]);
    expect(stats.power).toMatchObject({ estimate: 340, psu: null, level: "unknown" });
    expect(stats.notes).toEqual([
      "Con menos de 16 GB de RAM los juegos y programas actuales se quedan cortos.",
      "Falta almacenamiento para instalar el sistema.",
    ]);
  });

  it("la fuente justa o insuficiente se marca", () => {
    const tight = buildStats(
      { cpu: part({ tdp: 100 }), gpu: part({ tdp: 300 }), psu: part({ wattage: 500 }) },
      0,
    );
    expect(tight.power?.level).toBe("tight");
    const over = buildStats(
      { cpu: part({ tdp: 100 }), gpu: part({ tdp: 300 }), psu: part({ wattage: 450 }) },
      0,
    );
    expect(over.power?.level).toBe("over");
  });
});
