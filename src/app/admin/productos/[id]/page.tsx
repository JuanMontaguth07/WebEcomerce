import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { AdminPageHeader, dateTime } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAdminProduct,
  getBrandOptions,
  getCategoryOptions,
  getSpecDefinitions,
} from "@/features/admin/catalog";
import { deleteProduct } from "@/features/admin/catalog-actions";
import { requireAdmin } from "@/features/auth/session";
import { getInventoryMovements } from "@/features/inventory/queries";
import { MOVEMENT_LABELS } from "@/features/inventory/schemas";
import { ProductForm, type ProductFormValues } from "../product-form";
import { ImageManager } from "./image-manager";
import { SpecsEditor } from "./specs-editor";
import { StockPanel } from "./stock-panel";

export const metadata: Metadata = { title: "Editar producto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      aria-label={title}
      className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default async function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/productos/${id}`);
  if (!UUID.test(id)) notFound();

  const product = await getAdminProduct(id);
  if (!product) notFound();

  const [categories, brands, definitions, { movements }] = await Promise.all([
    getCategoryOptions(),
    getBrandOptions(),
    getSpecDefinitions(product.category_id),
    getInventoryMovements({ productId: id }),
  ]);

  const initial: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    productType: product.product_type,
    categoryId: product.category_id,
    brandId: product.brand_id ?? "",
    price: String(product.price),
    compareAtPrice: product.compare_at_price === null ? "" : String(product.compare_at_price),
    lowStockThreshold: String(product.low_stock_threshold),
    warrantyMonths: product.warranty_months === null ? "" : String(product.warranty_months),
    shortDescription: product.short_description ?? "",
    description: product.description ?? "",
    isActive: product.is_active,
    isFeatured: product.is_featured,
    seoTitle: product.seo_title ?? "",
    seoDescription: product.seo_description ?? "",
  };

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title={product.name}
        description={`SKU ${product.sku} · actualizado el ${dateTime.format(new Date(product.updated_at))}`}
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          <>
            <Badge variant={product.is_active ? "success" : "outline"}>
              {product.is_active ? "Visible" : "Oculto"}
            </Badge>
            {product.is_active && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/productos/${product.slug}`} target="_blank">
                  <ExternalLinkIcon aria-hidden />
                  Ver en la tienda
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <ProductForm
            productId={product.id}
            initial={initial}
            categories={categories}
            brands={brands}
          />
          <Card title="Imágenes" id="imagenes">
            <ImageManager
              productId={product.id}
              productName={product.name}
              images={product.images}
            />
          </Card>
          <Card title="Ficha técnica" id="ficha">
            <SpecsEditor
              key={product.category_id}
              productId={product.id}
              categoryId={product.category_id}
              definitions={definitions}
              values={product.specs}
            />
          </Card>
        </div>

        <div className="grid gap-6 xl:sticky xl:top-6">
          <Card title="Inventario" id="inventario">
            <StockPanel productId={product.id} stock={product.stock} />
          </Card>
          <Card title="Últimos movimientos">
            {movements.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {movements.slice(0, 8).map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0"
                  >
                    <div className="grid min-w-0 gap-0.5">
                      <span className="font-medium">{MOVEMENT_LABELS[movement.type]}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {dateTime.format(new Date(movement.createdAt))}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </span>
                    </div>
                    <span
                      className={
                        movement.quantity > 0
                          ? "font-mono text-success"
                          : "font-mono text-destructive"
                      }
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
            )}
            <Link
              href={`/admin/inventario?producto=${product.id}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver historial completo
            </Link>
          </Card>
          <Card title="Eliminar">
            <p className="text-sm text-muted-foreground">
              Solo se pueden eliminar productos sin pedidos ni movimientos de inventario. Para
              retirarlo de la tienda, desmarca «Visible en la tienda».
            </p>
            <DeleteButton
              label="Eliminar producto"
              confirmText={`¿Eliminar «${product.name}» y sus imágenes? No se puede deshacer.`}
              action={deleteProduct.bind(null, { id: product.id })}
              redirectTo="/admin/productos"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
