import { classifyHeader, type ProductField } from "./columns";

/** Una fila del archivo tal como viene (texto), con su número de línea en la hoja. */
export type RawProductRow = {
  line: number;
  fields: Partial<Record<ProductField, string>>;
  /** Ficha técnica por el nombre de la columna (sin «Ficha: »). */
  specs: Record<string, string>;
};

export type ParsedSheet = {
  rows: RawProductRow[];
  /** Encabezados que no se reconocieron (se ignoran). */
  unknownHeaders: string[];
  hasSku: boolean;
};

export const MAX_IMPORT_ROWS = 1000;
/** Filas por tanda al aplicar (el navegador las envía una tras otra y muestra el avance). */
export const APPLY_CHUNK = 50;

/** El separador más frecuente fuera de comillas en la primera línea: ; , o tabulador. */
function detectSeparator(text: string): string {
  let inQuotes = false;
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === "\n" || char === "\r")) break;
    else if (!inQuotes && char in counts) counts[char]! += 1;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]!;
  return count > 0 ? best : ";";
}

/** CSV con comillas dobles, saltos de línea dentro de comillas y "" como comilla. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const separator = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** El export antepone ' a lo que empieza con = + - @ (para que Excel no lo ejecute); aquí se quita. */
function unescapeCell(value: string): string {
  const trimmed = value.trim();
  return /^'[=+\-@]/.test(trimmed) ? trimmed.slice(1) : trimmed;
}

/** Lee la hoja: la primera fila son los encabezados; las filas vacías se saltan. */
export function readProductSheet(text: string): ParsedSheet {
  const [headers = [], ...lines] = parseCsv(text);
  const columns = headers.map((header) => ({ header: header.trim(), ...classifyHeader(header) }));
  const unknownHeaders = columns.filter((column) => column.kind === "unknown").map((c) => c.header);
  const rows: RawProductRow[] = [];
  lines.forEach((cells, index) => {
    if (cells.every((value) => !value.trim())) return;
    const row: RawProductRow = { line: index + 2, fields: {}, specs: {} };
    columns.forEach((column, position) => {
      const value = unescapeCell(cells[position] ?? "");
      if (!value) return;
      if (column.kind === "field") row.fields[column.field] = value;
      if (column.kind === "spec") row.specs[column.name] = value;
    });
    rows.push(row);
  });
  return {
    rows,
    unknownHeaders,
    hasSku: columns.some((column) => column.kind === "field" && column.field === "sku"),
  };
}

/**
 * Pesos colombianos tal como se escriben: «1.299.900», «$ 1.299.900», «1299900»
 * o «1,299,900». Devuelve null si no es un número.
 */
export function parseMoney(value: string): number | null {
  const clean = value.replace(/\$|COP|\s/gi, "");
  if (!clean) return null;
  // Separadores de miles con punto o coma (grupos de 3 dígitos).
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) return Number(clean.replace(/[.,]/g, ""));
  // Decimales: «1299900,00» o «1299900.5».
  const number = Number(clean.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

/** Número con coma o punto decimal («3,5» o «3.5»); null si no lo es. */
export function parseDecimal(value: string): number | null {
  const clean = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!clean || !/^-?\d+(\.\d+)?$/.test(clean)) return null;
  return Number(clean);
}

const YES = new Set(["si", "s", "yes", "y", "true", "1", "x", "verdadero"]);
const NO = new Set(["no", "n", "false", "0", "falso"]);

/** «Sí» / «No» y equivalentes; null si no se entiende. */
export function parseYesNo(value: string): boolean | null {
  const clean = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
  if (YES.has(clean)) return true;
  if (NO.has(clean)) return false;
  return null;
}
