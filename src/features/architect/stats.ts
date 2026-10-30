import { estimatePower } from "@/features/compatibility/rules";
import type { Build, PartSpecs } from "@/features/compatibility/types";
import { numberSpec } from "@/features/compatibility/values";

/**
 * Estadísticas de un equipo armado. El rendimiento sale del «puntaje de
 * rendimiento» (1–100) de procesador y gráfica que carga el admin desde tablas
 * de benchmarks: es una estimación relativa, no FPS medidos. Lo que no se
 * puede calcular por falta de datos se dice, no se adivina.
 */

/** Unos gráficos integrados equivalen a una gráfica muy básica. */
export const INTEGRATED_GPU_SCORE = 6;

export type PerformanceTier = { label: string; detail: string };

/** Para qué alcanza según el rendimiento en juegos (estimado). */
const TIERS: { min: number; tier: PerformanceTier }[] = [
  { min: 85, tier: { label: "4K alto", detail: "Juegos exigentes en 4K y lo que venga." } },
  { min: 70, tier: { label: "1440p ultra", detail: "1440p al máximo; 4K en calidad media." } },
  { min: 52, tier: { label: "1440p alto", detail: "Juegos actuales en 1440p con buena calidad." } },
  { min: 35, tier: { label: "1080p alto", detail: "Juegos actuales en 1080p con calidad alta." } },
  { min: 15, tier: { label: "1080p eSports", detail: "Juegos competitivos y ligeros en 1080p." } },
  { min: 0, tier: { label: "Oficina y estudio", detail: "Navegar, ofimática, clases y video." } },
];

export type BuildStats = {
  /** Puntajes estimados (0–100) o null si faltan datos. */
  performance: { gaming: number; work: number } | null;
  /** Piezas a las que les falta el puntaje para poder estimar. */
  missingScore: ("cpu" | "gpu")[];
  /** La gráfica es la integrada del procesador. */
  integratedGraphics: boolean;
  balance: { kind: "cpu-limits" | "gpu-limits" | "balanced"; message: string } | null;
  tier: PerformanceTier | null;
  power: {
    estimate: number;
    psu: number | null;
    /** Margen de la fuente sobre el consumo (0,3 = 30 %). */
    headroom: number | null;
    level: "ok" | "tight" | "over" | "unknown";
  } | null;
  /** Puntos de rendimiento en juegos por cada millón de pesos. */
  value: number | null;
  notes: string[];
};

function score(specs: PartSpecs | undefined): number | null {
  const value = specs ? numberSpec(specs, "perf_score") : null;
  return value === null ? null : Math.min(100, Math.max(1, value));
}

const hasIntegrated = (specs: PartSpecs) =>
  specs.integrated_graphics === true || specs.integrated_graphics === "true";

export function buildStats(build: Build, total: number): BuildStats {
  const { cpu, gpu, ram, psu, storage } = build;
  const notes: string[] = [];
  const integratedGraphics = Boolean(!gpu && cpu && hasIntegrated(cpu.specs));
  const cpuScore = score(cpu?.specs);
  const gpuScore = gpu ? score(gpu.specs) : integratedGraphics ? INTEGRATED_GPU_SCORE : null;
  const missingScore: ("cpu" | "gpu")[] = [
    ...(cpu && cpuScore === null ? (["cpu"] as const) : []),
    ...(gpu && gpuScore === null ? (["gpu"] as const) : []),
  ];

  let performance: BuildStats["performance"] = null;
  let balance: BuildStats["balance"] = null;
  if (cpuScore !== null && gpuScore !== null) {
    // En juegos manda la gráfica, pero un procesador flojo no la deja rendir.
    const gaming = Math.round(0.8 * Math.min(gpuScore, cpuScore * 1.3) + 0.2 * cpuScore);
    // En trabajo (render, compilar, edición) pesa más el procesador.
    const work = Math.round(0.75 * cpuScore + 0.25 * gpuScore);
    performance = { gaming, work };
    if (!integratedGraphics) {
      const ratio = gpuScore / cpuScore;
      balance =
        ratio > 1.5
          ? {
              kind: "cpu-limits",
              message:
                "El procesador limita a la gráfica: uno más potente sacaría más de ella en juegos.",
            }
          : ratio < 0.55
            ? {
                kind: "gpu-limits",
                message:
                  "La gráfica se queda corta frente al procesador: bien para trabajo, justa para juegos exigentes.",
              }
            : { kind: "balanced", message: "Procesador y gráfica están equilibrados." };
    }
  }

  const tier = performance
    ? (TIERS.find((item) => performance.gaming >= item.min)?.tier ?? null)
    : null;

  const estimate = estimatePower(build);
  let power: BuildStats["power"] = null;
  if (estimate !== null) {
    const wattage = psu ? numberSpec(psu.specs, "wattage") : null;
    const headroom = wattage ? (wattage - estimate) / wattage : null;
    power = {
      estimate,
      psu: wattage,
      headroom,
      level:
        headroom === null ? "unknown" : headroom < 0 ? "over" : headroom < 0.2 ? "tight" : "ok",
    };
  }

  const ramCapacity = ram ? numberSpec(ram.specs, "capacity") : null;
  if (ramCapacity !== null && ramCapacity < 16) {
    notes.push("Con menos de 16 GB de RAM los juegos y programas actuales se quedan cortos.");
  }
  if (cpu && !storage?.length) notes.push("Falta almacenamiento para instalar el sistema.");
  if (integratedGraphics) {
    notes.push("Sin gráfica dedicada: usa los gráficos del procesador (suficiente para oficina).");
  }

  return {
    performance,
    missingScore,
    integratedGraphics,
    balance,
    tier,
    power,
    value:
      performance && total > 0
        ? Math.round((performance.gaming / (total / 1_000_000)) * 10) / 10
        : null,
    notes,
  };
}
