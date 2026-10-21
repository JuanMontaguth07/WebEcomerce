import { PlusIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
  AdminTable,
  AdminTh,
  pageParam,
  param,
} from "@/components/admin/admin-ui";
import { StockBadge } from "@/components/shop/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminProducts, type ProductFilter } from "@/features/admin/catalog";
import { requireAdmin } from "@/features/auth/session";
import { formatCOP } from "@/lib/format";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

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
          <Button asChild>
            <Link href="/admin/productos/nuevo">
              <PlusIcon aria-hidden />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar productos" className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <Link
              key={item.value}
              href={href({ filtro: item.value, q })}
              aria-current={item.value === filter ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                item.value === filter
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "bg-card hover:border-input",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AdminSearch
          action="/admin/productos"
          defaultValue={q}
          placeholder="Nombre o SKU"
          hidden={{ filtro: filter === "all" ? undefined : filter }}
        />
      </div>

      {products.length ? (
        <AdminTable caption="Productos">
          <thead>
            <tr>
              <AdminTh>Producto</AdminTh>
              <AdminTh>Categoría</AdminTh>
              <AdminTh className="text-right">Precio</AdminTh>
              <AdminTh>Stock</AdminTh>
              <AdminTh>Estado</AdminTh>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-secondary">
                      {product.image && (
                        <Image
                          src={storageImageUrl(product.image)}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      )}
                    </span>
                    <div className="grid min-w-0">
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                    </div>
                  </div>
                </td>
                <td className="text-muted-foreground">
                  {product.category}
                  {product.brand && <div className="text-xs">{product.brand}</div>}
                </td>
                <td className="text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(product.price)}
                </td>
                <td>
                  <StockBadge stock={product.stock} lowStockThreshold={product.lowStockThreshold} />
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={product.isActive ? "success" : "outline"}>
                      {product.isActive ? "Visible" : "Oculto"}
                    </Badge>
                    {product.isFeatured && <Badge variant="soft">Destacado</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
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
