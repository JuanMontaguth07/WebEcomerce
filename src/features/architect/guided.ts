import { estimatePower, PSU_HEADROOM } from "@/features/compatibility/rules";
import { PART_LABELS, type PartKind } from "@/features/compatibility/types";
import { numberSpec, textSpec } from "@/features/compatibility/values";
import { formatCOP } from "@/lib/format";
import { candidateStatus, indexParts, toBuild, type PartIndex } from "./build";
import { EMPTY_SELECTION, type ArchitectPart, type Selection } from "./types";

/**
 * Modo guiado de Kova Architect: con seis respuestas reparte el presupuesto
 * entre las piezas según el uso y elige, dentro de cada parte, la opción
 * compatible con mejores especificaciones. Todo sale de la ficha técnica: no
 * promete FPS ni rendimiento que los datos no respaldan.
 */

export type Use = "gaming" | "work" | "study" | "editing" | "all";
export type Resolution = "1080p" | "1440p" | "4k";
export type BrandPreference = "any" | "amd" | "intel" | "nvidia";
export type Priority = "performance" | "looks" | "balanced";
export type Extras = "none" | "monitor" | "monitor-peripherals";

export type GuidedAnswers = {
  use: Use;
  /** Presupuesto total en COP (entero). */
  budget: number;
  resolution: Resolution;
  brand: BrandPreference;
  priority: Priority;
  extras: Extras;
};

export const DEFAULT_ANSWERS: GuidedAnswers = {
  use: "gaming",
  budget: 6_000_000,
  resolution: "1080p",
  brand: "any",
  priority: "balanced",
  extras: "none",
};

export const USE_LABELS: Record<Use, string> = {
  gaming: "Jugar",
  work: "Trabajar",
  study: "Estudiar",
  editing: "Editar foto o video",
  all: "Un poco de todo",
};

type Share = Partial<Record<PartKind, number>>;

/** Reparto del presupuesto de la torre por uso (suma 100). */
const SPLITS: Record<Use, Share> = {
  gaming: { gpu: 38, cpu: 20, motherboard: 12, ram: 8, storage: 7, psu: 7, case: 5, cooler: 3 },
  work: { cpu: 28, motherboard: 15, ram: 14, storage: 14, gpu: 6, psu: 9, case: 9, cooler: 5 },
  study: { cpu: 26, motherboard: 15, ram: 14, storage: 15, gpu: 6, psu: 10, case: 9, cooler: 5 },
  editing: { cpu: 27, gpu: 25, ram: 13, storage: 11, motherboard: 11, psu: 6, case: 4, cooler: 3 },
  all: { gpu: 30, cpu: 22, motherboard: 12, ram: 10, storage: 9, psu: 8, case: 5, cooler: 4 },
};

/** Por qué cada pieza se lleva su parte, según el uso. */
const WHY_SHARE: Partial<Record<Use, Partial<Record<PartKind, string>>>> = {
  gaming: {
    gpu: "para jugar la gráfica es lo que más pesa",
    cpu: "mantiene a la gráfica trabajando sin cuellos de botella",
  },
  editing: {
    cpu: "exportar y renderizar depende sobre todo del procesador",
    gpu: "acelera la edición y los efectos",
    ram: "los proyectos grandes necesitan memoria",
  },
  work: {
    cpu: "es lo que más se nota en el trabajo diario",
    ram: "permite tener muchas cosas abiertas",
  },
  study: {
    cpu: "es lo que más se nota en el día a día",
    storage: "un SSD hace que todo abra rápido",
  },
  all: { gpu: "sirve para jugar y para editar", cpu: "rinde en todo tipo de tareas" },
};

/** Porción del presupuesto total que se aparta para monitor y periféricos. */
const EXTRAS_SHARE: Record<Extras, number> = { none: 0, monitor: 15, "monitor-peripherals": 22 };

/** Ajusta el reparto por resolución y prioridad, y lo normaliza a 100. */
export function budgetShares(answers: GuidedAnswers): Share {
  const share: Share = { ...SPLITS[answers.use] };
  const move = (from: PartKind, to: PartKind, points: number) => {
    const available = Math.min(points, share[from] ?? 0);
    share[from] = (share[from] ?? 0) - available;
    share[to] = (share[to] ?? 0) + available;
  };
  if (answers.use === "gaming" || answers.use === "all") {
    if (answers.resolution === "1080p") move("gpu", "cpu", 4);
    if (answers.resolution === "4k") {
      move("cpu", "gpu", 4);
      move("storage", "gpu", 2);
    }
  }
  if (answers.priority === "looks") {
    move(answers.use === "gaming" ? "gpu" : "cpu", "case", 4);
    move("storage", "cooler", 2);
  }
  if (answers.priority === "performance") {
    move("case", answers.use === "gaming" ? "gpu" : "cpu", 2);
  }
  const total = Object.values(share).reduce((sum, value) => sum + (value ?? 0), 0);
  return Object.fromEntries(
    Object.entries(share).map(([kind, value]) => [kind, ((value ?? 0) / total) * 100]),
  );
}

// --- Puntaje por especificaciones: más es mejor; el precio desempata. ---------------

const has = (part: ArchitectPart, pattern: RegExp, ...keys: string[]) =>
  keys.some((key) => pattern.test(textSpec(part.specs, key) ?? ""));

function score(part: ArchitectPart, answers: GuidedAnswers): number {
  const n = (key: string) => numberSpec(part.specs, key) ?? 0;
  const looks = answers.priority === "looks";
  switch (part.kind) {
    case "cpu":
      return n("cores") * 10 + n("threads") * 2 + n("boost_clock") * 5;
    case "gpu":
      return n("vram") * 10 + (has(part, /gddr7/i, "memory_type") ? 6 : 0);
    case "ram":
      return n("capacity") * 2 + n("speed") / 500;
    case "storage":
      return n("capacity") / 100 + (has(part, /nvme/i, "interface") ? 8 : 0);
    case "motherboard":
      return n("memory_slots") * 2 + n("m2_slots") * 3;
    case "psu":
      return (has(part, /gold|platinum|titanium/i, "certification") ? 10 : 0) + n("wattage") / 100;
    case "cooler":
      return n("tdp_rating") / 10 + (looks && has(part, /l[ií]quid|aio/i, "cooling_type") ? 20 : 0);
    case "case":
      return n("included_fans") * 3 + (looks && has(part, /vidrio|glass/i, "side_panel") ? 10 : 0);
  }
}

/** La pieza pertenece a la marca pedida (por socket, marca o nombre). */
function matchesBrand(part: ArchitectPart, brand: BrandPreference): boolean {
  if (brand === "any") return true;
  const text = `${part.brand ?? ""} ${part.name}`;
  if (part.kind === "cpu") {
    const socket = textSpec(part.specs, "socket") ?? "";
    if (brand === "amd") return /^am\d/i.test(socket) || /amd|ryzen/i.test(text);
    if (brand === "intel") return /^lga/i.test(socket) || /intel|core/i.test(text);
    return true; // NVIDIA no hace procesadores: no filtra.
  }
  if (part.kind === "gpu") {
    if (brand === "nvidia") return /nvidia|geforce|rtx|gtx/i.test(text);
    if (brand === "amd") return /amd|radeon|\brx\b/i.test(text);
    if (brand === "intel") return /intel|arc/i.test(text);
  }
  return true;
}

export type GuidedPick = {
  kind: PartKind;
  part: ArchitectPart;
  /** Parte del presupuesto de la torre asignada a esta pieza (%). */
  share: number;
  allocation: number;
  reason: string;
  cheaper: ArchitectPart | null;
  better: ArchitectPart | null;
};

export type GuidedResult = {
  selection: Selection;
  picks: GuidedPick[];
  total: number;
  /** Presupuesto para la torre, sin lo apartado para monitor y periféricos. */
  towerBudget: number;
  extrasBudget: number;
  notes: string[];
  /** Tipos de pieza sin ninguna opción compatible en el catálogo. */
  missing: PartKind[];
};

/** Orden de elección: cada pieza se elige compatible con las anteriores. */
const ORDER: PartKind[] = ["cpu", "motherboard", "ram", "gpu", "case", "cooler", "storage", "psu"];

const needsDedicatedGpu = (answers: GuidedAnswers) =>
  answers.use === "gaming" || answers.use === "editing" || answers.use === "all";

const choose = (selection: Selection, part: ArchitectPart): Selection =>
  part.kind === "storage"
    ? { ...selection, storage: [part.id] }
    : { ...selection, parts: { ...selection.parts, [part.kind]: part.id } };

/** Lo más destacado de la ficha, como frase: «Tiene 8 núcleos», «Disipa hasta 250 W». */
function highlight(part: ArchitectPart): string | null {
  const n = (key: string) => numberSpec(part.specs, key);
  const capacity = n("capacity");
  switch (part.kind) {
    case "cpu":
      return n("cores") ? `Tiene ${n("cores")} núcleos` : null;
    case "gpu":
      return n("vram") ? `Tiene ${n("vram")} GB de memoria de video` : null;
    case "ram":
      return capacity ? `Son ${capacity} GB` : null;
    case "storage":
      return capacity
        ? `Guarda ${capacity >= 1000 ? `${capacity / 1000} TB` : `${capacity} GB`}`
        : null;
    case "psu":
      return n("wattage") ? `Entrega ${n("wattage")} W` : null;
    case "cooler":
      return n("tdp_rating") ? `Disipa hasta ${n("tdp_rating")} W` : null;
    case "case":
      return n("max_gpu_length") ? `Admite gráficas de hasta ${n("max_gpu_length")} mm` : null;
    case "motherboard":
      return textSpec(part.specs, "socket") ? `Usa socket ${textSpec(part.specs, "socket")}` : null;
  }
}

function describe(
  part: ArchitectPart,
  answers: GuidedAnswers,
  share: number,
  fit: "best" | "cheapest",
): string {
  const why = WHY_SHARE[answers.use]?.[part.kind];
  const lead = `Se lleva el ${Math.round(share)} % del presupuesto${why ? ` porque ${why}` : ""}.`;
  const detail = highlight(part);
  const verdict =
    fit === "best"
      ? "es la mejor opción que encaja con lo que tiene asignado"
      : "es la opción más económica que encaja (ninguna cabía en lo asignado)";
  return detail ? `${lead} ${detail}: ${verdict}.` : `${lead} Es ${verdict.slice(3)}.`;
}

/** Elige pieza por pieza. En modo económico toma siempre la más barata que encaja. */
function pickParts(answers: GuidedAnswers, parts: ArchitectPart[], frugal: boolean) {
  const index: PartIndex = indexParts(parts);
  const extrasBudget = Math.round((answers.budget * EXTRAS_SHARE[answers.extras]) / 100);
  const towerBudget = answers.budget - extrasBudget;
  const shares = budgetShares(answers);
  const notes: string[] = [];
  const missing: PartKind[] = [];
  const picks: GuidedPick[] = [];
  let selection: Selection = EMPTY_SELECTION;
  // Lo que una pieza no usa de su parte pasa a las siguientes, y lo que se pasa
  // se les descuenta.
  let carry = 0;
  // Sin gráfica dedicada, su parte va al almacenamiento (lo siguiente que más se nota).
  let storageBonus = 0;

  for (const kind of ORDER) {
    const share = shares[kind] ?? 0;
    if (kind === "gpu" && !needsDedicatedGpu(answers)) {
      const cpu = selection.parts.cpu ? index.get(selection.parts.cpu) : undefined;
      if (cpu?.specs.integrated_graphics === true) {
        storageBonus = Math.round((towerBudget * share) / 100);
        notes.push("Sin tarjeta gráfica dedicada: el procesador trae gráficos integrados.");
        continue;
      }
      if (cpu && cpu.specs.integrated_graphics !== false) {
        notes.push(
          "El procesador no informa si trae gráficos integrados: agregamos una gráfica para asegurar la imagen.",
        );
      }
    }

    const compatible = parts.filter(
      (part) => part.kind === kind && candidateStatus(selection, index, part)?.status !== "error",
    );
    if (!compatible.length) {
      missing.push(kind);
      continue;
    }
    const preferred = compatible.filter((part) => matchesBrand(part, answers.brand));
    if (answers.brand !== "any" && (kind === "cpu" || kind === "gpu") && !preferred.length) {
      notes.push(
        `No hay ${PART_LABELS[kind].toLocaleLowerCase("es-CO")} de la marca que prefieres que encaje: elegimos la mejor disponible.`,
      );
    }
    let pool = preferred.length ? preferred : compatible;

    // La fuente se elige por el consumo real del equipo armado hasta aquí.
    if (kind === "psu") {
      const gpu = selection.parts.gpu ? index.get(selection.parts.gpu) : undefined;
      const estimate = estimatePower(toBuild(selection, index)) ?? 0;
      const recommended = gpu ? (numberSpec(gpu.specs, "recommended_psu") ?? 0) : 0;
      const needed = Math.max(Math.ceil(estimate * PSU_HEADROOM), recommended);
      const enough = pool.filter((part) => (numberSpec(part.specs, "wattage") ?? 0) >= needed);
      if (enough.length) pool = enough;
    }

    const allocation =
      Math.round((towerBudget * share) / 100) + carry + (kind === "storage" ? storageBonus : 0);
    const byScore = (a: ArchitectPart, b: ArchitectPart) =>
      score(b, answers) - score(a, answers) || a.price - b.price;
    const cheapest = [...pool].sort(
      (a, b) => a.price - b.price || byScore(a, b),
    )[0] as ArchitectPart;
    const best = frugal
      ? undefined
      : [...pool].sort(byScore).find((part) => part.price <= allocation);
    const part = best ?? cheapest;

    carry = allocation - part.price;
    selection = choose(selection, part);
    picks.push({
      kind,
      part,
      share,
      allocation,
      reason: describe(part, answers, share, best ? "best" : "cheapest"),
      cheaper: [...pool].filter((option) => option.price < part.price).sort(byScore)[0] ?? null,
      better:
        [...pool]
          .filter((option) => score(option, answers) > score(part, answers))
          .sort((a, b) => a.price - b.price)[0] ?? null,
    });
  }

  const total = picks.reduce((sum, pick) => sum + pick.part.price, 0);
  return { selection, picks, total, towerBudget, extrasBudget, notes, missing };
}

/**
 * Arma una recomendación con las piezas disponibles (catálogo o demo). Si el
 * presupuesto no alcanza ni con lo más económico que encaja, usa eso y lo dice.
 */
export function recommendBuild(answers: GuidedAnswers, parts: ArchitectPart[]): GuidedResult {
  let result = pickParts(answers, parts, false);
  if (result.total > result.towerBudget) {
    const frugal = pickParts(answers, parts, true);
    if (frugal.total > frugal.towerBudget) {
      result = frugal;
      result.notes.unshift(
        `Tu presupuesto no alcanza para un equipo completo: lo más económico que encaja cuesta ${formatCOP(frugal.total)}.`,
      );
    } else {
      result.notes.unshift(
        `Esta recomendación se pasa por ${formatCOP(result.total - result.towerBudget)}. Con las alternativas más económicas puedes bajarla hasta ${formatCOP(frugal.total)}.`,
      );
    }
  }
  if (result.extrasBudget) {
    result.notes.push(
      `Apartamos ${formatCOP(result.extrasBudget)} para ${answers.extras === "monitor" ? "el monitor" : "el monitor y los periféricos"}: los eliges en el catálogo.`,
    );
  }
  return result;
}

/** Cambia una pieza de la recomendación por su alternativa. */
export function swapPick(selection: Selection, part: ArchitectPart): Selection {
  return choose(selection, part);
}
