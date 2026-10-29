import { adminExport } from "@/features/admin/export";
import { productsCsv } from "@/features/admin/import/export";
import { csvResponse } from "@/lib/csv";

/** Plantilla vacía con todas las columnas (incluida la ficha técnica de cada categoría). */
export function GET() {
  return adminExport(async () => csvResponse("plantilla-productos", await productsCsv([])));
}
