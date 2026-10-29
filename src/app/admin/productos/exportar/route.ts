import { listProductsForExport } from "@/features/admin/catalog";
import { adminExport } from "@/features/admin/export";
import { productsCsv } from "@/features/admin/import/export";
import { csvResponse } from "@/lib/csv";

/** Todo el catálogo en el mismo formato que entiende «Importar». */
export function GET() {
  return adminExport(async () =>
    csvResponse("productos", await productsCsv(await listProductsForExport())),
  );
}
