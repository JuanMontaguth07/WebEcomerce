import { listProductsForExport } from "@/features/admin/catalog";
import { adminExport } from "@/features/admin/export";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

export function GET() {
  return adminExport(async () => {
    const products = await listProductsForExport();
    const csv = toCsv(
      [
        "Producto",
        "SKU",
        "Categoría",
        "Marca",
        "Precio",
        "Precio anterior",
        "Stock",
        "Aviso de stock bajo",
        "Valor del inventario",
        "Garantía (meses)",
        "Visible",
        "Destacado",
        "Actualizado",
      ],
      products.map((product) => [
        product.name,
        product.sku,
        product.category?.name,
        product.brand?.name,
        Number(product.price),
        product.compare_at_price === null ? null : Number(product.compare_at_price),
        product.stock,
        product.low_stock_threshold,
        product.stock * Number(product.price),
        product.warranty_months,
        product.is_active,
        product.is_featured,
        csvDate(product.updated_at),
      ]),
    );
    return csvResponse("productos", csv);
  });
}
