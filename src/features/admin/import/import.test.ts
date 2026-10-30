import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { classifyHeader } from "./columns";
import { parseCsv, parseMoney, parseYesNo, readProductSheet } from "./parse";
import { planImport, summarize, type ImportContext } from "./plan";

const CPU = "11111111-1111-4111-8111-111111111111";
const GPU = "22222222-2222-4222-8222-222222222222";
const AMD = "33333333-3333-4333-8333-333333333333";
const CORES = "44444444-4444-4444-8444-444444444444";
const SOCKET = "55555555-5555-4555-8555-555555555555";
const IGPU = "66666666-6666-4666-8666-666666666666";
const EXISTING = "77777777-7777-4777-8777-777777777777";

const context: ImportContext = {
  categories: [
    { id: CPU, name: "Procesadores", slug: "procesadores" },
    { id: GPU, name: "Tarjetas gráficas", slug: "tarjetas-graficas" },
  ],
  brands: [{ id: AMD, name: "AMD", slug: "amd" }],
  specs: [
    { id: CORES, categoryId: CPU, key: "cores", label: "Núcleos", dataType: "number" },
    { id: SOCKET, categoryId: CPU, key: "socket", label: "Socket", dataType: "text" },
    {
      id: IGPU,
      categoryId: CPU,
      key: "integrated_graphics",
      label: "Gráficos integrados",
      dataType: "boolean",
    },
  ],
  products: [
    {
      id: EXISTING,
      stock: 4,
      specs: { [CORES]: "8", [SOCKET]: "AM5" },
      values: {
        name: "Ryzen 7 7800X3D",
        slug: "ryzen-7-7800x3d",
        sku: "CPU-7800X3D",
        productType: "component",
        categoryId: CPU,
        brandId: AMD,
        rarityId: null,
        flagId: null,
        uniqueNote: null,
        price: 1_899_900,
        compareAtPrice: null,
        lowStockThreshold: 2,
        warrantyMonths: 36,
        shortDescription: null,
        description: null,
        isActive: true,
        isFeatured: false,
        isReference: false,
        seoTitle: null,
        seoDescription: null,
      },
    },
  ],
};

const sheet = (lines: string[]) => readProductSheet(lines.join("\r\n"));

describe("leer el archivo", () => {
  it("entiende ; , o tabulador, comillas, saltos de línea y el BOM de Excel", () => {
    expect(parseCsv('﻿a;b\r\n"x;y";"dice ""hola""\nsigue"')).toEqual([
      ["a", "b"],
      ["x;y", 'dice "hola"\nsigue'],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")[1]).toEqual(["1", "2"]);
  });

  it("reconoce encabezados sin importar tildes ni nombres alternativos", () => {
    expect(classifyHeader("categoria")).toEqual({ kind: "field", field: "category" });
    expect(classifyHeader("Código")).toEqual({ kind: "field", field: "sku" });
    expect(classifyHeader("Garantía (meses)")).toEqual({ kind: "field", field: "warrantyMonths" });
    expect(classifyHeader("Ficha: Núcleos")).toEqual({ kind: "spec", name: "Núcleos" });
    expect(classifyHeader("Valor del inventario")).toEqual({ kind: "ignored" });
    expect(classifyHeader("Color favorito")).toEqual({ kind: "unknown" });
  });

  it("lee precios en pesos como se escriben y Sí/No", () => {
    expect(parseMoney("$ 1.299.900")).toBe(1_299_900);
    expect(parseMoney("1299900")).toBe(1_299_900);
    expect(parseMoney("1,299,900")).toBe(1_299_900);
    expect(parseMoney("diez")).toBeNull();
    expect(parseYesNo("Sí")).toBe(true);
    expect(parseYesNo("no")).toBe(false);
    expect(parseYesNo("tal vez")).toBeNull();
  });

  it("salta filas vacías, numera las líneas como en Excel y quita el escape de fórmulas", () => {
    const parsed = sheet(["SKU;Producto;Color favorito", "A-1;'=Raro", ";", "B-2;Otro"]);
    expect(parsed.unknownHeaders).toEqual(["Color favorito"]);
    expect(parsed.rows.map((row) => [row.line, row.fields.name])).toEqual([
      [2, "=Raro"],
      [4, "Otro"],
    ]);
  });
});

describe("planear la importación", () => {
  it("crea lo nuevo con slug propio y lo deja oculto si no dice Visible", () => {
    const [row] = planImport(
      sheet([
        "SKU;Producto;Categoría;Marca;Precio;Stock;Ficha: Núcleos;Ficha: Gráficos integrados",
        "cpu-9600x;Ryzen 5 9600X;procesadores;amd;$ 1.099.900;6;6;Sí",
      ]).rows,
      context,
    );
    expect(row).toMatchObject({
      action: "create",
      sku: "CPU-9600X",
      stockDelta: 6,
      values: {
        slug: "ryzen-5-9600x",
        price: 1_099_900,
        categoryId: CPU,
        brandId: AMD,
        isActive: false,
      },
    });
    expect(row?.specs).toEqual([
      { specId: CORES, value: "6" },
      { specId: IGPU, value: "true" },
    ]);
    expect(row?.warnings[0]).toMatch(/Se crea oculto/);
  });

  it("al actualizar solo cambia lo que trae la fila y conserva la ficha", () => {
    const [row] = planImport(
      sheet(["SKU;Precio;Stock;Ficha: Socket", "CPU-7800X3D;1.799.900;10;AM5"]).rows,
      context,
    );
    expect(row).toMatchObject({ action: "update", productId: EXISTING, stockDelta: 6 });
    expect(row?.changes).toEqual(["Precio", "Stock 4 → 10"]);
    expect(row?.values).toMatchObject({ name: "Ryzen 7 7800X3D", warrantyMonths: 36 });
    expect(row?.specs).toBeNull();
  });

  it("sin cambios reales lo deja igual (exportar y volver a subir no toca nada)", () => {
    const exported = toCsv(
      [
        "Producto",
        "SKU",
        "Categoría",
        "Marca",
        "Precio",
        "Stock",
        "Visible",
        "Valor del inventario",
      ],
      [["Ryzen 7 7800X3D", "CPU-7800X3D", "Procesadores", "AMD", 1_899_900, 4, true, 7_599_600]],
    );
    const plan = planImport(readProductSheet(exported).rows, context);
    expect(plan[0]?.action).toBe("unchanged");
  });

  it("explica cada error en palabras y por campo", () => {
    const plan = planImport(
      sheet([
        "SKU;Producto;Categoría;Precio;Precio anterior;Visible;Ficha: Núcleos",
        ";Sin código;Procesadores;100000;;;",
        "NUEVO-1;Algo;Monitores;100000;;;",
        "NUEVO-2;Algo;Procesadores;cien;;;",
        "NUEVO-3;Algo;Procesadores;500000;400000;quizá;ocho",
        "NUEVO-3;Repetido;Procesadores;1;;;",
      ]).rows,
      context,
    );
    expect(summarize(plan)).toEqual({ create: 0, update: 0, unchanged: 0, error: 5 });
    expect(plan[0]?.errors[0]).toMatch(/Falta el SKU/);
    expect(plan[1]?.errors[0]).toMatch(/no existe «Monitores»/);
    expect(plan[2]?.errors[0]).toMatch(/Precio: «cien» no es un valor en pesos/);
    // Sin repetir el mismo campo con el mensaje general del formulario.
    expect(plan[2]?.errors.filter((error) => error.startsWith("Precio:"))).toHaveLength(1);
    expect(plan[3]?.errors.join(" ")).toMatch(/Visible: «quizá»/);
    expect(plan[4]?.errors[0]).toMatch(/se repite en el archivo \(ya está en la línea 5\)/);
  });

  it("avisa de datos de ficha que la categoría no tiene, sin frenar la fila", () => {
    const [row] = planImport(sheet(["SKU;Ficha: VRAM", "CPU-7800X3D;12 GB"]).rows, context);
    expect(row?.action).toBe("unchanged");
    expect(row?.warnings[0]).toMatch(/Ficha «VRAM»/);
  });

  it("valida el precio anterior frente al precio, igual que el formulario", () => {
    const [row] = planImport(sheet(["SKU;Precio anterior", "CPU-7800X3D;1.000.000"]).rows, context);
    expect(row?.action).toBe("error");
    expect(row?.errors[0]).toMatch(/^Precio anterior:/);
  });
});
