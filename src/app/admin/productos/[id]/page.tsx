import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { AdminPageHeader, dateTime } from "@/components/admin/admin-ui";
import { CommentInChatButton } from "@/components/admin/live/comment-in-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAdminProduct,
  getBrandOptions,
  getCategoryOptions,
  getProductHistoryCounts,
  getSpecDefinitions,
} from "@/features/admin/catalog";
import { listActivity } from "@/features/activity/queries";
import { listAdminFlags } from "@/features/flags/queries";
import { listAdminRarities } from "@/features/rarities/queries";
import { requireAdmin } from "@/features/auth/session";
import { getProductOffers } from "@/features/offers/queries";
import { toCardSpecs } from "@/features/catalog/specs";
import { getInventoryMovements } from "@/features/inventory/queries";
import { MOVEMENT_LABELS } from "@/features/inventory/schemas";
import { ProductCardPreview, ProductDraftProvider } from "../product-draft";
import { ProductForm, type ProductFormValues } from "../product-form";
import { ImageManager } from "./image-manager";
import { OffersEditor } from "./offers-editor";
import { DeleteProductPanel, DuplicateProductButton } from "./product-actions";
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

  const [
    categories,
    brands,
    definitions,
    { movements },
    counts,
    activity,
    rarities,
    flags,
    offers,
  ] = await Promise.all([
    getCategoryOptions(),
    getBrandOptions(),
    getSpecDefinitions(product.category_id),
    getInventoryMovements({ productId: id, pageSize: 8 }),
    getProductHistoryCounts(id),
    listActivity({ entityId: id, limit: 6 }),
    listAdminRarities(),
    listAdminFlags(),
    getProductOffers(id),
  ]);

  const initial: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    productType: product.product_type,
    categoryId: product.category_id,
    brandId: product.brand_id ?? "",
    rarityId: product.rarity_id ?? "",
    flagId: product.flag_id ?? "",
    uniqueNote: product.unique_note ?? "",
    price: String(product.price),
    compareAtPrice: product.compare_at_price === null ? "" : String(product.compare_at_price),
    lowStockThreshold: String(product.low_stock_threshold),
    warrantyMonths: product.warranty_months === null ? "" : String(product.warranty_months),
    shortDescription: product.short_description ?? "",
    description: product.description ?? "",
    isActive: product.is_active,
    isFeatured: product.is_featured,
    isReference: product.is_reference,
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
            <DuplicateProductButton productId={product.id} />
            <CommentInChatButton productId={product.id} />
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

      <ProductDraftProvider initial={initial}>
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="grid gap-6">
            <ProductForm
              productId={product.id}
              initial={initial}
              categories={categories}
              brands={brands}
              rarities={rarities}
              flags={flags}
            />
            <Card title="Imágenes" id="imagenes">
              <ImageManager
                productId={product.id}
                productName={product.name}
                images={product.images}
              />
            </Card>
            <Card title="En otras tiendas" id="ofertas">
              <OffersEditor productId={product.id} productName={product.name} offers={offers} />
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

          <div className="grid gap-6">
            <Card title="Así se ve en la tienda">
              <ProductCardPreview
                categories={categories}
                brands={brands}
                rarities={rarities}
                flags={flags}
                image={
                  product.images[0]
                    ? {
                        path: product.images[0].storage_path,
                        alt: product.images[0].alt_text ?? product.name,
                      }
                    : null
                }
                keySpecs={toCardSpecs(
                  product.specs.map((spec) => ({
                    ...spec,
                    definition:
                      definitions.find(
                        (definition) => definition.id === spec.spec_id && definition.show_on_card,
                      ) ?? null,
                  })),
                )}
                stock={product.stock}
              />
            </Card>
            <Card title="Inventario" id="inventario">
              <StockPanel productId={product.id} stock={product.stock} />
            </Card>
            <Card title="Últimos movimientos">
              {movements.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {movements.map((movement) => (
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
                Ver todos los movimientos
              </Link>
            </Card>
            <Card title="Historial de cambios">
              {activity.entries.length ? (
                <ActivityFeed
                  entries={activity.entries}
                  existing={activity.existing}
                  names={activity.names}
                  compact
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sin cambios registrados todavía.</p>
              )}
              <Link
                href={`/admin/actividad?id=${product.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver todo el historial
              </Link>
            </Card>
            <Card title="Eliminar">
              <DeleteProductPanel
                productId={product.id}
                productName={product.name}
                stock={product.stock}
                orderCount={counts.orders}
                movementCount={counts.movements}
              />
            </Card>
          </div>
        </div>
      </ProductDraftProvider>
    </div>
  );
}
