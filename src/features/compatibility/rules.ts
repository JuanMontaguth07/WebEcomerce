import type { Build, BuildPart, CompatibilityResult, PartKind } from "./types";
import { listSpec, moduleCount, normalizeToken, numberSpec, textSpec, usesM2Slot } from "./values";

/**
 * Reglas de compatibilidad. Cada una devuelve null si todavía no están elegidas
 * las piezas que compara, y «unknown» cuando falta un dato: nunca adivina.
 */
export type Rule = (build: Build) => CompatibilityResult | null;

/** Consumo de placa, memoria, discos y ventiladores que se suma al de CPU y GPU. */
export const BASE_POWER_W = 75;
/** Margen de la fuente sobre el consumo estimado para no ir al límite. */
export const PSU_HEADROOM = 1.3;
/** Margen de longitud de la gráfica dentro del gabinete para considerarlo cómodo. */
export const GPU_CLEARANCE_MM = 10;
/** Capacidad térmica del disipador sobre el TDP para considerarla holgada. */
export const COOLER_HEADROOM = 1.2;

const result = (
  rule: string,
  parts: PartKind[],
  title: string,
  status: CompatibilityResult["status"],
  message: string,
): CompatibilityResult => ({ rule, parts, title, status, message });

const missing = (part: BuildPart, what: string) => `Falta ${what} de «${part.name}» en su ficha.`;

export const cpuSocket: Rule = ({ cpu, motherboard }) => {
  if (!cpu || !motherboard) return null;
  const make = result.bind(null, "cpu-socket", ["cpu", "motherboard"], "Socket del procesador");
  const a = textSpec(cpu.specs, "socket");
  const b = textSpec(motherboard.specs, "socket");
  if (!a) return make("unknown", missing(cpu, "el socket"));
  if (!b) return make("unknown", missing(motherboard, "el socket"));
  return normalizeToken(a) === normalizeToken(b)
    ? make("ok", `Procesador y placa usan socket ${a}.`)
    : make("error", `El procesador usa socket ${a} y la placa ${b}: no encajan.`);
};

export const memoryType: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard) return null;
  const make = result.bind(null, "memory-type", ["ram", "motherboard"], "Tipo de memoria");
  const a = textSpec(ram.specs, "memory_type");
  const b = textSpec(motherboard.specs, "memory_type");
  if (!a) return make("unknown", missing(ram, "el tipo de memoria"));
  if (!b) return make("unknown", missing(motherboard, "la memoria compatible"));
  return normalizeToken(a) === normalizeToken(b)
    ? make("ok", `La memoria y la placa son ${a}.`)
    : make("error", `La memoria es ${a} y la placa solo acepta ${b}.`);
};

export const memorySlots: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard) return null;
  const make = result.bind(null, "memory-slots", ["ram", "motherboard"], "Ranuras de memoria");
  const modules = moduleCount(ram.specs);
  const slots = numberSpec(motherboard.specs, "memory_slots");
  if (modules === null) return make("unknown", missing(ram, "la cantidad de módulos"));
  if (slots === null) return make("unknown", missing(motherboard, "las ranuras de memoria"));
  return modules <= slots
    ? make("ok", `${modules} de ${slots} ranuras ocupadas.`)
    : make("error", `El kit trae ${modules} módulos y la placa tiene ${slots} ranuras.`);
};

export const caseFormFactor: Rule = ({ motherboard, case: chassis }) => {
  if (!motherboard || !chassis) return null;
  const make = result.bind(null, "case-form-factor", ["motherboard", "case"], "Formato de placa");
  const board = textSpec(motherboard.specs, "form_factor");
  const supported = listSpec(chassis.specs, "form_factor");
  if (!board) return make("unknown", missing(motherboard, "el formato"));
  if (!supported) return make("unknown", missing(chassis, "las placas compatibles"));
  return supported.some((item) => normalizeToken(item) === normalizeToken(board))
    ? make("ok", `El gabinete admite placas ${board}.`)
    : make("error", `La placa es ${board} y el gabinete admite ${supported.join(", ")}.`);
};

export const gpuLength: Rule = ({ gpu, case: chassis }) => {
  if (!gpu || !chassis) return null;
  const make = result.bind(null, "gpu-length", ["gpu", "case"], "Largo de la gráfica");
  const length = numberSpec(gpu.specs, "length");
  const max = numberSpec(chassis.specs, "max_gpu_length");
  if (length === null) return make("unknown", missing(gpu, "la longitud"));
  if (max === null) return make("unknown", missing(chassis, "la longitud máxima de gráfica"));
  const margin = max - length;
  if (margin < 0) {
    return make("error", `La gráfica mide ${length} mm y el gabinete admite hasta ${max} mm.`);
  }
  if (margin < GPU_CLEARANCE_MM) {
    return make(
      "warning",
      `Cabe muy justa: ${length} mm en un espacio de ${max} mm (${margin} mm de margen).`,
    );
  }
  return make("ok", `La gráfica mide ${length} mm y caben hasta ${max} mm.`);
};

export const coolerSupport: Rule = ({ cooler, cpu }) => {
  if (!cooler || !cpu) return null;
  const make = result.bind(null, "cooler-cpu", ["cooler", "cpu"], "Refrigeración del procesador");
  const socket = textSpec(cpu.specs, "socket");
  const sockets = listSpec(cooler.specs, "socket_support");
  if (!socket) return make("unknown", missing(cpu, "el socket"));
  if (!sockets) return make("unknown", missing(cooler, "los sockets compatibles"));
  if (!sockets.some((item) => normalizeToken(item) === normalizeToken(socket))) {
    return make("error", `El disipador no trae montaje para socket ${socket}.`);
  }
  const tdp = numberSpec(cpu.specs, "tdp");
  const rating = numberSpec(cooler.specs, "tdp_rating");
  if (tdp === null || rating === null) {
    return make(
      "unknown",
      `Monta en socket ${socket}, pero falta ${tdp === null ? "el TDP del procesador" : "la capacidad térmica del disipador"} para confirmar que alcanza.`,
    );
  }
  if (rating < tdp) {
    return make(
      "warning",
      `Disipa hasta ${rating} W y el procesador genera ${tdp} W: puede bajar su rendimiento por temperatura.`,
    );
  }
  if (rating < tdp * COOLER_HEADROOM) {
    return make("warning", `Capacidad justa: disipa ${rating} W para un procesador de ${tdp} W.`);
  }
  return make("ok", `Monta en socket ${socket} y disipa ${rating} W para ${tdp} W.`);
};

/**
 * Consumo estimado: CPU + GPU + resto del equipo. null si alguna pieza elegida
 * no informa su consumo (no se puede estimar sin inventar).
 */
export function estimatePower({ cpu, gpu }: Build): number | null {
  if (!cpu && !gpu) return null;
  const cpuW = cpu ? numberSpec(cpu.specs, "tdp") : 0;
  const gpuW = gpu ? numberSpec(gpu.specs, "tdp") : 0;
  if (cpuW === null || gpuW === null) return null;
  return cpuW + gpuW + BASE_POWER_W;
}

export const psuWattage: Rule = (build) => {
  const { psu, cpu, gpu } = build;
  if (!psu || (!cpu && !gpu)) return null;
  const parts: PartKind[] = [
    "psu",
    ...(cpu ? (["cpu"] as const) : []),
    ...(gpu ? (["gpu"] as const) : []),
  ];
  const make = result.bind(null, "psu-wattage", parts, "Potencia de la fuente");
  const wattage = numberSpec(psu.specs, "wattage");
  const estimate = estimatePower(build);
  if (wattage === null) return make("unknown", missing(psu, "la potencia"));
  if (estimate === null) {
    return make("unknown", "Falta el consumo (TDP) del procesador o de la gráfica para estimar.");
  }
  const recommended = gpu ? numberSpec(gpu.specs, "recommended_psu") : null;
  if (wattage < estimate) {
    return make(
      "error",
      `La fuente de ${wattage} W no alcanza: el consumo estimado es de ${estimate} W.`,
    );
  }
  if (recommended !== null && wattage < recommended) {
    return make(
      "warning",
      `La gráfica pide una fuente de ${recommended} W y esta es de ${wattage} W (consumo estimado ${estimate} W).`,
    );
  }
  if (wattage < estimate * PSU_HEADROOM) {
    return make(
      "warning",
      `Poco margen: ${wattage} W para un consumo estimado de ${estimate} W. Lo ideal es un 30 % más.`,
    );
  }
  return make("ok", `${wattage} W para un consumo estimado de ${estimate} W.`);
};

export const m2Slots: Rule = ({ storage = [], motherboard }) => {
  const drives = storage.filter((drive) => usesM2Slot(drive.specs));
  if (!drives.length || !motherboard) return null;
  const make = result.bind(null, "m2-slots", ["storage", "motherboard"], "Ranuras M.2");
  const slots = numberSpec(motherboard.specs, "m2_slots");
  if (slots === null) return make("unknown", missing(motherboard, "las ranuras M.2"));
  return drives.length <= slots
    ? make("ok", `${drives.length} de ${slots} ranuras M.2 ocupadas.`)
    : make("error", `Hay ${drives.length} unidades M.2 y la placa tiene ${slots} ranuras.`);
};

// --- Datos que el catálogo todavía no tiene: se dice, no se supone. ---------------

export const coolerHeight: Rule = ({ cooler, case: chassis }) => {
  if (!cooler || !chassis) return null;
  const make = result.bind(null, "cooler-height", ["cooler", "case"], "Altura del disipador");
  const height = numberSpec(cooler.specs, "height");
  const max = numberSpec(chassis.specs, "max_cooler_height");
  if (height === null || max === null) {
    return make(
      "unknown",
      "Para confirmar que el disipador cabe faltan su altura y la altura máxima del gabinete.",
    );
  }
  return height <= max
    ? make("ok", `El disipador mide ${height} mm y caben hasta ${max} mm.`)
    : make("error", `El disipador mide ${height} mm y el gabinete admite hasta ${max} mm.`);
};

export const radiatorSupport: Rule = ({ cooler, case: chassis }) => {
  if (!cooler || !chassis) return null;
  const type = textSpec(cooler.specs, "cooling_type") ?? "";
  if (!/l[ií]quid|aio/i.test(type)) return null;
  const make = result.bind(null, "radiator", ["cooler", "case"], "Radiador");
  const size = numberSpec(cooler.specs, "radiator_size");
  const supported = listSpec(chassis.specs, "radiator_support");
  if (size === null || !supported) {
    return make(
      "unknown",
      "Para confirmar dónde va el radiador faltan su tamaño y los radiadores que admite el gabinete.",
    );
  }
  return supported.some((item) => numberSpec({ item }, "item") === size)
    ? make("ok", `El gabinete admite radiadores de ${size} mm.`)
    : make("error", `El radiador es de ${size} mm y el gabinete admite ${supported.join(", ")}.`);
};

export const psuConnectors: Rule = ({ gpu, psu }) => {
  if (!gpu || !psu) return null;
  return result(
    "psu-connectors",
    ["psu", "gpu"],
    "Conectores de la gráfica",
    "unknown",
    "Revisa que la fuente traiga los conectores que pide la gráfica (por ejemplo 12V-2x6 o 8 pines): la ficha no los informa.",
  );
};

/** En el orden en que se muestran: primero lo que impide armar el equipo. */
export const RULES: Rule[] = [
  cpuSocket,
  memoryType,
  memorySlots,
  caseFormFactor,
  gpuLength,
  coolerSupport,
  psuWattage,
  m2Slots,
  coolerHeight,
  radiatorSupport,
  psuConnectors,
];
