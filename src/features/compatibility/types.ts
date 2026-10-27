/** Piezas que arma Kova Architect. */
export const PART_KINDS = [
  "cpu",
  "motherboard",
  "gpu",
  "ram",
  "storage",
  "psu",
  "cooler",
  "case",
] as const;

export type PartKind = (typeof PART_KINDS)[number];

export const PART_LABELS: Record<PartKind, string> = {
  cpu: "Procesador",
  motherboard: "Placa madre",
  gpu: "Tarjeta gráfica",
  ram: "Memoria RAM",
  storage: "Almacenamiento",
  psu: "Fuente de poder",
  cooler: "Refrigeración",
  case: "Gabinete",
};

/** Valores de la ficha técnica por clave (los mismos de product_specs). */
export type PartSpecs = Record<string, string | number | boolean | null | undefined>;

export type BuildPart = { name: string; specs: PartSpecs };

/** Una pieza por tipo, salvo almacenamiento, que admite varias unidades. */
export type Build = Partial<Record<Exclude<PartKind, "storage">, BuildPart>> & {
  storage?: BuildPart[];
};

/**
 * ok: compatible · warning: funciona con reparos · error: no funciona ·
 * unknown: falta un dato para confirmarlo (nunca se adivina).
 */
export type CompatibilityStatus = "ok" | "warning" | "error" | "unknown";

export type CompatibilityResult = {
  rule: string;
  status: CompatibilityStatus;
  title: string;
  /** Explicación en lenguaje claro, con los datos que se compararon. */
  message: string;
  parts: PartKind[];
};

export const STATUS_LABELS: Record<CompatibilityStatus, string> = {
  ok: "Compatible",
  warning: "Advertencia",
  error: "Incompatible",
  unknown: "No se puede confirmar",
};

/** Valor guardado en categories.architect_part, validado (la base lo guarda como texto). */
export function asPartKind(value: string | null | undefined): PartKind | null {
  return PART_KINDS.find((kind) => kind === value) ?? null;
}
