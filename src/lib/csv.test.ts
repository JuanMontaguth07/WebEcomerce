import { describe, expect, it } from "vitest";
import { csvDate, toCsv } from "./csv";

describe("toCsv", () => {
  it("usa punto y coma, BOM y saltos de línea de Windows", () => {
    expect(toCsv(["Pedido", "Total"], [[1001, 250000]])).toBe("﻿Pedido;Total\r\n1001;250000\r\n");
  });

  it("escapa separadores, comillas y saltos de línea", () => {
    const csv = toCsv(["Nota"], [['Dice "hola"; adiós'], ["línea 1\nlínea 2"]]);
    expect(csv).toContain('"Dice ""hola""; adiós"');
    expect(csv).toContain('"línea 1\nlínea 2"');
  });

  it("neutraliza textos que Excel ejecutaría como fórmula", () => {
    const csv = toCsv(["Cliente"], [['=HYPERLINK("x")'], ["+57 300"], ["@sum"], ["-1"]]);
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).toContain("'+57 300");
    expect(csv).toContain("'@sum");
    expect(csv).toContain("'-1");
  });

  it("deja los números negativos como números y vacíos los nulos", () => {
    expect(toCsv(["A", "B", "C"], [[-5, null, true]])).toContain("-5;;Sí");
  });
});

describe("csvDate", () => {
  it("formatea en hora de Colombia", () => {
    expect(csvDate("2026-10-26T19:30:00Z")).toBe("2026-10-26 14:30");
  });
});
