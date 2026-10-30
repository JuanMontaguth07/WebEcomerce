import { listCustomers, type Customer } from "@/features/admin/customers";
import { adminExport } from "@/features/admin/export";
import { csvDate, csvResponse, toCsv } from "@/lib/csv";

const PAGE = 100;
const MAX_ROWS = 20_000;

/** Todos los clientes con sus compras, para Excel. */
export function GET() {
  return adminExport(async () => {
    const customers: Customer[] = [];
    for (let page = 1; customers.length < MAX_ROWS; page += 1) {
      const result = await listCustomers({ page, pageSize: PAGE });
      customers.push(...result.customers);
      if (page >= result.pageCount) break;
    }
    const csv = toCsv(
      [
        "Nombre",
        "Correo",
        "Teléfono",
        "Ciudad",
        "Departamento",
        "Pedidos",
        "Pagados",
        "Pendientes",
        "Cancelados",
        "Gastado",
        "Primer pedido",
        "Último pedido",
      ],
      customers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        customer.city,
        customer.department,
        customer.orders,
        customer.paidOrders,
        customer.pendingOrders,
        customer.cancelledOrders,
        customer.spent,
        csvDate(customer.firstOrderAt),
        csvDate(customer.lastOrderAt),
      ]),
    );
    return csvResponse("clientes", csv);
  });
}
