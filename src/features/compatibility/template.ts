import type { PartKind } from "./types";

/**
 * Plantilla de ficha técnica por pieza para Kova Architect. Las claves son las
 * que leen las reglas de compatibilidad (marcadas con `architect`), más las que
 * ayudan a comparar. Aplicarla solo agrega lo que falta: nunca borra ni cambia
 * lo que el admin ya cargó. template.test.ts comprueba que cubre todo lo que
 * leen las reglas.
 */
export type SpecTemplate = {
  key: string;
  label: string;
  groupLabel: string;
  unit: string | null;
  dataType: "text" | "number" | "boolean";
  isFilterable: boolean;
  /** La usa el motor de compatibilidad. */
  architect: boolean;
  /** Ayuda para el admin al cargar el valor. */
  hint?: string;
};

const spec = (
  key: string,
  label: string,
  groupLabel: string,
  dataType: SpecTemplate["dataType"],
  options: Partial<Pick<SpecTemplate, "unit" | "isFilterable" | "architect" | "hint">> = {},
): SpecTemplate => ({
  key,
  label,
  groupLabel,
  dataType,
  unit: options.unit ?? null,
  isFilterable: options.isFilterable ?? false,
  architect: options.architect ?? false,
  ...(options.hint ? { hint: options.hint } : {}),
});

export const ARCHITECT_TEMPLATES: Record<PartKind, SpecTemplate[]> = {
  cpu: [
    spec("socket", "Socket", "Compatibilidad", "text", {
      isFilterable: true,
      architect: true,
      hint: "Ej.: AM5, LGA1851",
    }),
    spec("cores", "Núcleos", "Rendimiento", "number", { isFilterable: true }),
    spec("threads", "Hilos", "Rendimiento", "number"),
    spec("boost_clock", "Frecuencia máxima", "Rendimiento", "number", { unit: "GHz" }),
    spec("tdp", "TDP", "Energía", "number", { unit: "W", architect: true }),
    spec("integrated_graphics", "Gráficos integrados", "Rendimiento", "boolean"),
    spec("perf_score", "Puntaje de rendimiento", "Rendimiento", "number", {
      hint: "Del 1 al 100 frente al procesador más potente del mercado (100). Tómalo de una tabla de benchmarks.",
    }),
  ],
  motherboard: [
    spec("socket", "Socket", "Compatibilidad", "text", { isFilterable: true, architect: true }),
    spec("chipset", "Chipset", "Compatibilidad", "text"),
    spec("form_factor", "Formato", "Compatibilidad", "text", {
      isFilterable: true,
      architect: true,
      hint: "Ej.: ATX, Micro-ATX, Mini-ITX",
    }),
    spec("memory_type", "Memoria compatible", "Memoria", "text", {
      architect: true,
      hint: "Ej.: DDR5",
    }),
    spec("memory_slots", "Ranuras de memoria", "Memoria", "number", { architect: true }),
    spec("m2_slots", "Ranuras M.2", "Almacenamiento", "number", { architect: true }),
  ],
  gpu: [
    spec("vram", "Memoria de video", "Memoria", "number", { unit: "GB", isFilterable: true }),
    spec("memory_type", "Tipo de memoria", "Memoria", "text"),
    spec("interface", "Interfaz", "Conectividad", "text"),
    spec("tdp", "Consumo típico", "Energía", "number", { unit: "W", architect: true }),
    spec("recommended_psu", "Fuente recomendada", "Energía", "number", {
      unit: "W",
      architect: true,
    }),
    spec("length", "Longitud", "Dimensiones", "number", { unit: "mm", architect: true }),
    spec("perf_score", "Puntaje de rendimiento", "Rendimiento", "number", {
      hint: "Del 1 al 100 frente a la gráfica más potente del mercado (100). Tómalo de una tabla de benchmarks.",
    }),
  ],
  ram: [
    spec("capacity", "Capacidad total", "Memoria", "number", { unit: "GB", isFilterable: true }),
    spec("memory_type", "Tipo", "Memoria", "text", {
      isFilterable: true,
      architect: true,
      hint: "Ej.: DDR5",
    }),
    spec("modules", "Módulos", "Memoria", "text", {
      architect: true,
      hint: "Cantidad × tamaño, ej.: 2 × 16 GB",
    }),
    spec("speed", "Velocidad", "Rendimiento", "number", { unit: "MHz" }),
    spec("latency", "Latencia", "Rendimiento", "text"),
  ],
  storage: [
    spec("capacity", "Capacidad", "Almacenamiento", "number", { unit: "GB", isFilterable: true }),
    spec("interface", "Interfaz", "Conectividad", "text", {
      isFilterable: true,
      architect: true,
      hint: "Ej.: NVMe PCIe 4.0 o SATA III",
    }),
    spec("form_factor", "Formato", "Conectividad", "text", {
      architect: true,
      hint: 'Ej.: M.2 2280 o 2,5"',
    }),
    spec("read_speed", "Lectura secuencial", "Rendimiento", "number", { unit: "MB/s" }),
    spec("write_speed", "Escritura secuencial", "Rendimiento", "number", { unit: "MB/s" }),
  ],
  psu: [
    spec("wattage", "Potencia", "Energía", "number", {
      unit: "W",
      isFilterable: true,
      architect: true,
    }),
    spec("certification", "Certificación", "Energía", "text", { isFilterable: true }),
    spec("modular", "Cableado", "Diseño", "text"),
    spec("form_factor", "Formato", "Diseño", "text"),
  ],
  cooler: [
    spec("cooling_type", "Tipo", "Diseño", "text", {
      isFilterable: true,
      architect: true,
      hint: "Aire o Líquida AIO",
    }),
    spec("socket_support", "Sockets compatibles", "Compatibilidad", "text", {
      architect: true,
      hint: "Separados por coma, ej.: AM5, AM4, LGA1851",
    }),
    spec("tdp_rating", "Capacidad térmica", "Rendimiento", "number", {
      unit: "W",
      architect: true,
    }),
    spec("radiator_size", "Radiador / ventilador", "Diseño", "number", {
      unit: "mm",
      architect: true,
    }),
    spec("height", "Altura", "Dimensiones", "number", { unit: "mm", architect: true }),
  ],
  case: [
    spec("form_factor", "Placas compatibles", "Compatibilidad", "text", {
      isFilterable: true,
      architect: true,
      hint: "Separadas por coma, ej.: ATX, Micro-ATX, Mini-ITX",
    }),
    spec("max_gpu_length", "Longitud máxima de GPU", "Compatibilidad", "number", {
      unit: "mm",
      architect: true,
    }),
    spec("max_cooler_height", "Altura máxima del disipador", "Compatibilidad", "number", {
      unit: "mm",
      architect: true,
    }),
    spec("radiator_support", "Radiadores compatibles", "Compatibilidad", "text", {
      architect: true,
      hint: "Tamaños en mm separados por coma, ej.: 240, 280, 360",
    }),
    spec("included_fans", "Ventiladores incluidos", "Refrigeración", "number"),
    spec("side_panel", "Panel lateral", "Diseño", "text"),
  ],
};

/** Claves de la ficha que usa el motor para esa pieza (para marcarlas en el panel). */
export function architectKeys(part: PartKind): Set<string> {
  return new Set(
    ARCHITECT_TEMPLATES[part].filter((item) => item.architect).map((item) => item.key),
  );
}

/** Cuáles de la plantilla faltan en la ficha actual, con su posición a continuación. */
export function missingTemplateSpecs(
  part: PartKind,
  existing: { key: string; position: number }[],
): (SpecTemplate & { position: number })[] {
  const keys = new Set(existing.map((item) => item.key));
  let position = existing.reduce((max, item) => Math.max(max, item.position), 0);
  return ARCHITECT_TEMPLATES[part]
    .filter((item) => !keys.has(item.key))
    .map((item) => ({ ...item, position: (position += 1) }));
}
