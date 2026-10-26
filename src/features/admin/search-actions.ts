"use server";

import { z } from "zod";
import { adminAction } from "@/lib/admin-action";
import { sanitizeSearch } from "./shared";

export type QuickResult = { href: string; title: string; detail: string };

/** Búsqueda rápida de la paleta de comandos: productos por nombre o SKU y pedidos. */
export const adminQuickSearch = adminAction(
  z.object({ q: z.string().max(80) }),
  async ({ q }, { supabase }) => {
    const search = sanitizeSearch(q);
    if (!search) return { products: [] as QuickResult[], orders: [] as QuickResult[] };

    const number = Number(search.replace(/^#/, ""));
    const ordersQuery = supabase
      .from("orders")
      .select("id, order_number, customer_name, status")
      .order("created_at", { ascending: false })
      .limit(5);

    const [products, orders] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, is_active")
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        .order("updated_at", { ascending: false })
        .limit(6),
      Number.isInteger(number) && number > 0
        ? ordersQuery.eq("order_number", number)
        : ordersQuery.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`),
    ]);
    if (products.error) throw products.error;
    if (orders.error) throw orders.error;

    return {
      products: products.data.map((row) => ({
        href: `/admin/productos/${row.id}`,
        title: row.name,
        detail: `${row.sku}${row.is_active ? "" : " · oculto"}`,
      })),
      orders: orders.data.map((row) => ({
        href: `/admin/pedidos/${row.id}`,
        title: `Pedido #${row.order_number}`,
        detail: row.customer_name,
      })),
    };
  },
);
