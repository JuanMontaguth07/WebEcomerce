import { describe, expect, it } from "vitest";
import { demoPart } from "@/features/architect/demo-parts";
import { checkBuild, overallStatus, partStatus } from "./engine";
import {
  caseFormFactor,
  coolerHeight,
  coolerSupport,
  cpuSocket,
  estimatePower,
  gpuLength,
  m2Slots,
  memorySlots,
  memoryType,
  psuConnectors,
  psuWattage,
  radiatorSupport,
} from "./rules";
import { asPartKind, type Build, type BuildPart, type PartSpecs } from "./types";
import { listSpec, moduleCount, normalizeToken, numberSpec, usesM2Slot } from "./values";

const part = (name: string, specs: PartSpecs): BuildPart => ({ name, specs });
const fromDemo = (id: string): BuildPart => {
  const { name, specs } = demoPart(id);
  return { name, specs };
};

describe("lectura de la ficha", () => {
  it("entiende números escritos de varias formas", () => {
    expect(numberSpec({ v: 322 }, "v")).toBe(322);
    expect(numberSpec({ v: "322 mm" }, "v")).toBe(322);
    expect(numberSpec({ v: "1.000 W" }, "v")).toBe(1000);
    expect(numberSpec({ v: "5.3 GHz" }, "v")).toBe(5.3);
    expect(numberSpec({ v: '2,5"' }, "v")).toBe(2.5);
    expect(numberSpec({ v: "" }, "v")).toBeNull();
    expect(numberSpec({}, "v")).toBeNull();
  });

  it("compara formatos y sockets sin importar mayúsculas, guiones ni alias", () => {
    expect(normalizeToken("Micro-ATX")).toBe(normalizeToken("micro atx"));
    expect(normalizeToken("mATX")).toBe(normalizeToken("Micro-ATX"));
    expect(normalizeToken("LGA 1851")).toBe(normalizeToken("lga1851"));
  });

  it("separa listas y cuenta módulos", () => {
    expect(listSpec({ v: "AM5, AM4 / LGA1700" }, "v")).toEqual(["AM5", "AM4", "LGA1700"]);
    expect(moduleCount({ modules: "2 × 16 GB" })).toBe(2);
    expect(moduleCount({ modules: "4x8GB" })).toBe(4);
    expect(moduleCount({ modules: "1 módulo de 16 GB" })).toBe(1);
    expect(moduleCount({ modules: "16 GB" })).toBeNull();
  });

  it("reconoce las unidades que van en ranura M.2", () => {
    expect(usesM2Slot({ interface: "NVMe PCIe 4.0" })).toBe(true);
    expect(usesM2Slot({ interface: "SATA", form_factor: "M.2 2280" })).toBe(true);
    expect(usesM2Slot({ interface: "SATA III", form_factor: '2,5"' })).toBe(false);
  });
});

describe("reglas", () => {
  const cpu = part("CPU", { socket: "AM5", tdp: 120 });
  const board = part("Placa", {
    socket: "AM5",
    memory_type: "DDR5",
    memory_slots: 2,
    form_factor: "Micro-ATX",
    m2_slots: 1,
  });

  it("no opinan hasta que están las dos piezas", () => {
    expect(cpuSocket({ cpu })).toBeNull();
    expect(gpuLength({ gpu: part("GPU", { length: 300 }) })).toBeNull();
    expect(psuWattage({ psu: part("PSU", { wattage: 650 }) })).toBeNull();
  });

  it("socket: igual, distinto o sin dato", () => {
    expect(cpuSocket({ cpu, motherboard: board })?.status).toBe("ok");
    expect(cpuSocket({ cpu: part("CPU", { socket: "LGA1851" }), motherboard: board })?.status).toBe(
      "error",
    );
    expect(cpuSocket({ cpu: part("CPU", {}), motherboard: board })?.status).toBe("unknown");
  });

  it("memoria: tipo y ranuras", () => {
    const ddr4 = part("RAM", { memory_type: "DDR4", modules: "1 × 16 GB" });
    const kit4 = part("RAM", { memory_type: "DDR5", modules: "4 × 16 GB" });
    expect(memoryType({ ram: ddr4, motherboard: board })?.message).toContain("DDR4");
    expect(memoryType({ ram: ddr4, motherboard: board })?.status).toBe("error");
    expect(memorySlots({ ram: kit4, motherboard: board })?.status).toBe("error");
    expect(memorySlots({ ram: ddr4, motherboard: board })?.status).toBe("ok");
  });

  it("formato de placa en el gabinete", () => {
    const atx = part("Gabinete", { form_factor: "ATX, Micro-ATX" });
    const itx = part("Gabinete", { form_factor: "Mini-ITX" });
    expect(caseFormFactor({ motherboard: board, case: atx })?.status).toBe("ok");
    expect(caseFormFactor({ motherboard: board, case: itx })?.status).toBe("error");
  });

  it("largo de la gráfica: cabe, justa o no cabe", () => {
    const chassis = part("Gabinete", { max_gpu_length: 300 });
    const len = (length: number) => gpuLength({ gpu: part("GPU", { length }), case: chassis });
    expect(len(280)?.status).toBe("ok");
    expect(len(295)?.status).toBe("warning");
    expect(len(310)?.status).toBe("error");
    expect(len(310)?.message).toBe("La gráfica mide 310 mm y el gabinete admite hasta 300 mm.");
  });

  it("disipador: socket y capacidad térmica", () => {
    const cooler = (specs: PartSpecs) => coolerSupport({ cpu, cooler: part("Disipador", specs) });
    expect(cooler({ socket_support: "AM5, AM4", tdp_rating: 180 })?.status).toBe("ok");
    expect(cooler({ socket_support: "AM5", tdp_rating: 130 })?.status).toBe("warning");
    expect(cooler({ socket_support: "AM5", tdp_rating: 95 })?.status).toBe("warning");
    expect(cooler({ socket_support: "AM4", tdp_rating: 180 })?.status).toBe("error");
    expect(cooler({ socket_support: "AM5" })?.status).toBe("unknown");
  });

  it("fuente: consumo estimado, margen y lo que pide la gráfica", () => {
    const gpu = part("GPU", { tdp: 250, recommended_psu: 650 });
    // 120 + 250 + 75 = 445 W
    expect(estimatePower({ cpu, gpu })).toBe(445);
    const psu = (wattage: number) => psuWattage({ cpu, gpu, psu: part("Fuente", { wattage }) });
    expect(psu(400)?.status).toBe("error");
    expect(psu(550)?.status).toBe("warning"); // debajo de los 650 W que pide la gráfica
    expect(psu(650)?.status).toBe("ok");
    expect(psu(400)?.message).toContain("445 W");
    // Sin gráfica dedicada: solo procesador y resto.
    expect(estimatePower({ cpu })).toBe(195);
    expect(
      psuWattage({ cpu, gpu: part("GPU", {}), psu: part("Fuente", { wattage: 750 }) })?.status,
    ).toBe("unknown");
  });

  it("ranuras M.2: cuenta solo las unidades M.2", () => {
    const nvme = part("NVMe", { interface: "NVMe PCIe 4.0" });
    const sata = part("SATA", { interface: "SATA III" });
    expect(m2Slots({ motherboard: board, storage: [sata] })).toBeNull();
    expect(m2Slots({ motherboard: board, storage: [nvme, sata] })?.status).toBe("ok");
    expect(m2Slots({ motherboard: board, storage: [nvme, nvme] })?.status).toBe("error");
  });

  it("lo que el catálogo no informa se marca como no confirmable", () => {
    const chassis = part("Gabinete", {});
    const aio = part("AIO", { cooling_type: "Líquida AIO", radiator_size: 240 });
    expect(coolerHeight({ cooler: aio, case: chassis })?.status).toBe("unknown");
    expect(radiatorSupport({ cooler: aio, case: chassis })?.status).toBe("unknown");
    expect(
      radiatorSupport({ cooler: part("Aire", { cooling_type: "Aire" }), case: chassis }),
    ).toBeNull();
    expect(psuConnectors({ gpu: part("GPU", {}), psu: part("Fuente", {}) })?.status).toBe(
      "unknown",
    );
  });

  it("con los datos nuevos, altura y radiador se comprueban de verdad", () => {
    const chassis = part("Gabinete", { max_cooler_height: 160, radiator_support: "240, 280" });
    expect(coolerHeight({ cooler: part("Torre", { height: 158 }), case: chassis })?.status).toBe(
      "ok",
    );
    expect(coolerHeight({ cooler: part("Torre", { height: 170 }), case: chassis })?.status).toBe(
      "error",
    );
    const aio = (radiator_size: number) =>
      radiatorSupport({
        cooler: part("AIO", { cooling_type: "AIO", radiator_size }),
        case: chassis,
      });
    expect(aio(240)?.status).toBe("ok");
    expect(aio(360)?.status).toBe("error");
  });
});

describe("equipos con piezas demo", () => {
  const good: Build = {
    cpu: fromDemo("demo-cpu-8"),
    motherboard: fromDemo("demo-mb-x870"),
    gpu: fromDemo("demo-gpu-12"),
    ram: fromDemo("demo-ram-d5-32"),
    storage: [fromDemo("demo-ssd-nvme-2t")],
    psu: fromDemo("demo-psu-750"),
    cooler: fromDemo("demo-cool-aio240"),
    case: fromDemo("demo-case-a5"),
  };

  it("un equipo bien armado no tiene incompatibilidades, solo datos por confirmar", () => {
    const results = checkBuild(good);
    expect(results.filter((item) => item.status === "error")).toEqual([]);
    expect(overallStatus(results)).toBe("unknown");
    expect(partStatus(results, "cpu")).toBe("ok");
  });

  it("los problemas salen primero y marcan las piezas afectadas", () => {
    const results = checkBuild({
      ...good,
      cpu: fromDemo("demo-cpu-20"),
      gpu: fromDemo("demo-gpu-16"),
      psu: fromDemo("demo-psu-550"),
      case: fromDemo("demo-case-m3"),
    });
    expect(results[0]?.status).toBe("error");
    expect(overallStatus(results)).toBe("error");
    const errors = results.filter((item) => item.status === "error").map((item) => item.rule);
    expect(errors).toEqual(
      expect.arrayContaining(["cpu-socket", "case-form-factor", "gpu-length"]),
    );
    // 125 + 320 + 75 = 520 W: la fuente de 550 W alcanza, pero la gráfica pide 850 W.
    const psu = results.find((item) => item.rule === "psu-wattage");
    expect(psu?.status).toBe("warning");
    expect(psu?.message).toContain("850 W");
    expect(partStatus(results, "gpu")).toBe("error");
  });

  it("sin piezas no hay nada que evaluar", () => {
    expect(checkBuild({})).toEqual([]);
    expect(overallStatus([])).toBeNull();
  });
});

describe("asPartKind", () => {
  it("acepta solo las piezas conocidas", () => {
    expect(asPartKind("gpu")).toBe("gpu");
    expect(asPartKind("monitor")).toBeNull();
    expect(asPartKind(null)).toBeNull();
  });
});
