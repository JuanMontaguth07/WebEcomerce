import type { NextRequest } from "next/server";
import { adminExport, collectPages } from "@/features/admin/export";
import { getInventoryMovements, type MovementType } from "@/features/inventory/queries";
import { MOVEMENT_LABELS } from "@/features/inventory/schemas";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GET(request: NextRequest) {
  return adminExport(async () => {
    const params = request.nextUrl.searchParams;
    const rawType = params.get("tipo") ?? "";
    const type = Object.hasOwn(MOVEMENT_LABELS, rawType) ? (rawType as MovementType) : undefined;
    const rawProduct = params.get("producto") ?? "";
    const productId = UUID.test(rawProduct) ? rawProduct : undefined;

    const movements = await collectPages(async (page) => {
      const result = await getInventoryMovements({ productId, type, page, pageSize: 1000 });
      return { items: result.movements, pageCount: result.pageCount };
    });

    const csv = toCsv(
      [
        "Fecha",
        "Producto",
        "SKU",
        "Tipo",
        "Cantidad",
        "Stock anterior",
        "Stock resultante",
        "Pedido",
        "Motivo",
        "Registrado por",
      ],
      movements.map((movement) => [
        csvDate(movement.createdAt),
        movement.productName,
        movement.productSku,
        MOVEMENT_LABELS[movement.type],
        movement.quantity,
        movement.previousStock,
        movement.resultingStock,
        movement.orderNumber ? `#${movement.orderNumber}` : null,
        movement.reason,
        movement.author ?? (movement.orderId ? "Cliente / sistema" : "Sistema"),
      ]),
    );
    return csvResponse("inventario", csv);
  });
}
