/**
 * CSV para abrir en Excel con configuración regional de Colombia: separador
 * punto y coma y BOM para que reconozca UTF-8 (tildes y eñes).
 */

const SEPARATOR = ";";

export type CsvValue = string | number | boolean | null | undefined;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  // Un texto que empieza con = + - @ se ejecutaría como fórmula al abrirlo (datos del cliente).
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(SEPARATOR));
  return `﻿${lines.join("\r\n")}\r\n`;
}

const exportDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Bogota",
  dateStyle: "short",
  timeStyle: "short",
});

/** Fecha legible y ordenable en hoja de cálculo: «2026-10-26 14:30» (hora de Colombia). */
export function csvDate(value: string | Date): string {
  return exportDate.format(typeof value === "string" ? new Date(value) : value);
}

/** Respuesta de descarga con nombre de archivo fechado. */
export function csvResponse(name: string, csv: string): Response {
  const stamp = csvDate(new Date()).slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
