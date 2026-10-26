import type { NextRequest } from "next/server";
import { adminExport } from "@/features/admin/export";
import { listOrdersForExport } from "@/features/admin/orders";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/features/orders/transitions";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

export function GET(request: NextRequest) {
  return adminExport(async () => {
    const params = request.nextUrl.searchParams;
    const rawStatus = params.get("estado") ?? "";
    const status = Object.hasOwn(ORDER_STATUS_LABELS, rawStatus)
      ? (rawStatus as OrderStatus)
      : undefined;
    const orders = await listOrdersForExport({ status, q: params.get("q") ?? undefined });

    const csv = toCsv(
      [
        "Pedido",
        "Fecha",
        "Estado",
        "Cliente",
        "Correo",
        "Teléfono",
        "Documento",
        "Departamento",
        "Ciudad",
        "Dirección",
        "Productos",
        "Subtotal",
        "Envío",
        "Total",
      ],
      orders.map((order) => [
        order.orderNumber,
        csvDate(order.createdAt),
        ORDER_STATUS_LABELS[order.status],
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.customerDocument,
        order.department,
        order.city,
        order.address,
        order.items,
        order.subtotal,
        order.shippingCost ?? "Por confirmar",
        order.total,
      ]),
    );
    return csvResponse("pedidos", csv);
  });
}
