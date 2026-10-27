import { RULES } from "./rules";
import type { Build, CompatibilityResult, CompatibilityStatus } from "./types";

const SEVERITY: Record<CompatibilityStatus, number> = { error: 3, warning: 2, unknown: 1, ok: 0 };

/** Todas las comprobaciones que aplican a las piezas elegidas, lo más grave primero. */
export function checkBuild(build: Build): CompatibilityResult[] {
  return RULES.flatMap((rule) => rule(build) ?? []).sort(
    (a, b) => SEVERITY[b.status] - SEVERITY[a.status],
  );
}

/**
 * Estado general del equipo: incompatible si algo no encaja; advertencia si algo
 * funciona con reparos; «no se puede confirmar» si faltan datos; si no, compatible.
 * null si todavía no hay nada que comparar.
 */
export function overallStatus(results: CompatibilityResult[]): CompatibilityStatus | null {
  if (!results.length) return null;
  return results.reduce<CompatibilityStatus>(
    (worst, item) => (SEVERITY[item.status] > SEVERITY[worst] ? item.status : worst),
    "ok",
  );
}

/** Estado que afecta a una pieza en particular (para el punto de color de cada ranura). */
export function partStatus(
  results: CompatibilityResult[],
  part: CompatibilityResult["parts"][number],
): CompatibilityStatus | null {
  return overallStatus(results.filter((item) => item.parts.includes(part)));
}
