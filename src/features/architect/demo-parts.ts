import type { PartKind, PartSpecs } from "@/features/compatibility/types";

/**
 * Piezas de demostración de Kova Architect. Son ficticias, se muestran siempre
 * marcadas como «Demo» y no se pueden comprar: existen para probar el
 * configurador cuando el catálogo todavía no tiene productos con su ficha.
 * Los precios son de ejemplo, en pesos enteros.
 */
export type DemoPart = {
  id: string;
  kind: PartKind;
  name: string;
  /** Precio de ejemplo en COP (entero). */
  price: number;
  specs: PartSpecs;
};

export const DEMO_PARTS: DemoPart[] = [
  // Procesadores
  {
    id: "demo-cpu-6",
    kind: "cpu",
    name: "Procesador demo 6 núcleos AM5",
    price: 849_900,
    specs: {
      socket: "AM5",
      cores: 6,
      threads: 12,
      boost_clock: 5.1,
      tdp: 65,
      integrated_graphics: true,
      perf_score: 44,
    },
  },
  {
    id: "demo-cpu-8",
    kind: "cpu",
    name: "Procesador demo 8 núcleos AM5",
    price: 1_389_900,
    specs: {
      socket: "AM5",
      cores: 8,
      threads: 16,
      boost_clock: 5.4,
      tdp: 120,
      integrated_graphics: true,
      perf_score: 63,
    },
  },
  {
    id: "demo-cpu-20",
    kind: "cpu",
    name: "Procesador demo 20 núcleos LGA1851",
    price: 2_499_900,
    specs: {
      socket: "LGA1851",
      cores: 20,
      threads: 20,
      boost_clock: 5.5,
      tdp: 125,
      integrated_graphics: true,
      perf_score: 82,
    },
  },
  // Placas madre
  {
    id: "demo-mb-b650m",
    kind: "motherboard",
    name: "Placa demo B650M Micro-ATX",
    price: 739_900,
    specs: {
      socket: "AM5",
      chipset: "B650",
      form_factor: "Micro-ATX",
      memory_type: "DDR5",
      memory_slots: 2,
      m2_slots: 2,
    },
  },
  {
    id: "demo-mb-x870",
    kind: "motherboard",
    name: "Placa demo X870 ATX",
    price: 1_459_900,
    specs: {
      socket: "AM5",
      chipset: "X870",
      form_factor: "ATX",
      memory_type: "DDR5",
      memory_slots: 4,
      m2_slots: 4,
    },
  },
  {
    id: "demo-mb-z890",
    kind: "motherboard",
    name: "Placa demo Z890 ATX",
    price: 1_299_900,
    specs: {
      socket: "LGA1851",
      chipset: "Z890",
      form_factor: "ATX",
      memory_type: "DDR5",
      memory_slots: 4,
      m2_slots: 3,
    },
  },
  // Tarjetas gráficas
  {
    id: "demo-gpu-8",
    kind: "gpu",
    name: "Gráfica demo 8 GB",
    price: 1_599_900,
    specs: {
      vram: 8,
      memory_type: "GDDR6",
      tdp: 145,
      recommended_psu: 550,
      length: 240,
      perf_score: 30,
    },
  },
  {
    id: "demo-gpu-12",
    kind: "gpu",
    name: "Gráfica demo 12 GB",
    price: 2_849_900,
    specs: {
      vram: 12,
      memory_type: "GDDR7",
      tdp: 250,
      recommended_psu: 650,
      length: 285,
      perf_score: 54,
    },
  },
  {
    id: "demo-gpu-16",
    kind: "gpu",
    name: "Gráfica demo 16 GB",
    price: 4_199_900,
    specs: {
      vram: 16,
      memory_type: "GDDR7",
      tdp: 320,
      recommended_psu: 850,
      length: 336,
      perf_score: 76,
    },
  },
  // Memorias
  {
    id: "demo-ram-d4-16",
    kind: "ram",
    name: "Memoria demo DDR4 16 GB (1×16)",
    price: 169_900,
    specs: { capacity: 16, memory_type: "DDR4", modules: "1 × 16 GB", speed: 3200 },
  },
  {
    id: "demo-ram-d5-32",
    kind: "ram",
    name: "Memoria demo DDR5 32 GB (2×16)",
    price: 489_900,
    specs: { capacity: 32, memory_type: "DDR5", modules: "2 × 16 GB", speed: 6000 },
  },
  {
    id: "demo-ram-d5-64",
    kind: "ram",
    name: "Memoria demo DDR5 64 GB (4×16)",
    price: 949_900,
    specs: { capacity: 64, memory_type: "DDR5", modules: "4 × 16 GB", speed: 5600 },
  },
  // Almacenamiento
  {
    id: "demo-ssd-sata-1t",
    kind: "storage",
    name: "SSD demo SATA 1 TB",
    price: 219_900,
    specs: { capacity: 1000, interface: "SATA III", form_factor: '2,5"' },
  },
  {
    id: "demo-ssd-nvme-1t",
    kind: "storage",
    name: "SSD demo NVMe 1 TB",
    price: 289_900,
    specs: { capacity: 1000, interface: "NVMe PCIe 4.0", form_factor: "M.2 2280" },
  },
  {
    id: "demo-ssd-nvme-2t",
    kind: "storage",
    name: "SSD demo NVMe 2 TB",
    price: 529_900,
    specs: { capacity: 2000, interface: "NVMe PCIe 4.0", form_factor: "M.2 2280" },
  },
  // Fuentes
  {
    id: "demo-psu-550",
    kind: "psu",
    name: "Fuente demo 550 W Bronze",
    price: 249_900,
    specs: { wattage: 550, certification: "80 Plus Bronze", modular: "No modular" },
  },
  {
    id: "demo-psu-750",
    kind: "psu",
    name: "Fuente demo 750 W Gold",
    price: 449_900,
    specs: { wattage: 750, certification: "80 Plus Gold", modular: "Totalmente modular" },
  },
  {
    id: "demo-psu-1000",
    kind: "psu",
    name: "Fuente demo 1000 W Gold",
    price: 749_900,
    specs: { wattage: 1000, certification: "80 Plus Gold", modular: "Totalmente modular" },
  },
  // Refrigeración
  {
    id: "demo-cool-air",
    kind: "cooler",
    name: "Disipador demo por aire 120 mm",
    price: 119_900,
    specs: {
      cooling_type: "Aire",
      socket_support: "AM5, AM4, LGA1851, LGA1700",
      radiator_size: 120,
      tdp_rating: 180,
    },
  },
  {
    id: "demo-cool-aio240",
    kind: "cooler",
    name: "Refrigeración líquida demo 240 mm",
    price: 389_900,
    specs: {
      cooling_type: "Líquida AIO",
      socket_support: "AM5, AM4, LGA1851, LGA1700",
      radiator_size: 240,
      tdp_rating: 250,
    },
  },
  {
    id: "demo-cool-am4",
    kind: "cooler",
    name: "Disipador demo compacto AM4",
    price: 79_900,
    specs: { cooling_type: "Aire", socket_support: "AM4", radiator_size: 92, tdp_rating: 95 },
  },
  // Gabinetes
  {
    id: "demo-case-m3",
    kind: "case",
    name: "Gabinete demo compacto Micro-ATX",
    price: 249_900,
    specs: { form_factor: "Micro-ATX, Mini-ITX", max_gpu_length: 300, included_fans: 2 },
  },
  {
    id: "demo-case-a5",
    kind: "case",
    name: "Gabinete demo ATX vidrio templado",
    price: 389_900,
    specs: { form_factor: "ATX, Micro-ATX, Mini-ITX", max_gpu_length: 360, included_fans: 3 },
  },
  {
    id: "demo-case-a7",
    kind: "case",
    name: "Gabinete demo E-ATX amplio",
    price: 599_900,
    specs: { form_factor: "E-ATX, ATX, Micro-ATX", max_gpu_length: 400, included_fans: 4 },
  },
];

export function demoPart(id: string): DemoPart {
  const part = DEMO_PARTS.find((item) => item.id === id);
  if (!part) throw new Error(`Pieza demo desconocida: ${id}`);
  return part;
}
