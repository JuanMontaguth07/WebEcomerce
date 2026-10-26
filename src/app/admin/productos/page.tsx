import { DownloadIcon, PlusIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
  FilterChips,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { listAdminProducts, type ProductFilter } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { ProductsTable } from "./products-table";

export const metadata: Metadata = { title: "Productos" };

const FILTERS: { value: ProductFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Visibles" },
  { value: "inactive", label: "Ocultos" },
  { value: "low", label: "Stock bajo" },
  { value: "out", label: "Agotados" },
];

function href(params: { filtro?: string; q?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.filtro && params.filtro !== "all") search.set("filtro", params.filtro);
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return `/admin/productos${query ? `?${query}` : ""}` as Route;
}

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  await requireAdmin("/admin/productos");
  const params = await searchParams;
  const rawFilter = param(params.filtro);
  const filter = FILTERS.some((f) => f.value === rawFilter) ? (rawFilter as ProductFilter) : "all";
  const q = param(params.q);
  const page = pageParam(params.pagina);
  const { products, total, pageCount } = await listAdminProducts({ q, filter, page });

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Productos"
        description={`${total} ${total === 1 ? "producto" : "productos"}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/admin/productos/exportar" prefetch={false}>
                <DownloadIcon aria-hidden />
                Exportar CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/productos/nuevo">
                <PlusIcon aria-hidden />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Filtrar productos"
          items={FILTERS.map((item) => ({
            key: item.value,
            label: item.label,
            href: href({ filtro: item.value, q }),
            active: item.value === filter,
          }))}
        />
        <AdminSearch
          action="/admin/productos"
          defaultValue={q}
          placeholder="Nombre o SKU"
          hidden={{ filtro: filter === "all" ? undefined : filter }}
        />
      </div>

      {products.length ? (
        <ProductsTable products={products} />
      ) : (
        <AdminEmpty>
          {q || filter !== "all"
            ? "Ningún producto coincide con el filtro."
            : "Aún no hay productos."}
        </AdminEmpty>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        hrefFor={(p) => href({ filtro: filter, q, pagina: p })}
      />
    </div>
  );
}
