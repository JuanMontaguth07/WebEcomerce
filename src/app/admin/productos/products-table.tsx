"use client";

import {
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  GemIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AdminTable, AdminTh } from "@/components/admin/admin-ui";
import { ReasonInput } from "@/components/admin/reason-input";
import { StockBadge } from "@/components/shop/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductFlagTag } from "@/components/shop/product-flag";
import { RarityBadge } from "@/components/shop/rarity-badge";
import { fieldBase } from "@/components/ui/input";
import { bulkDeleteProducts, bulkUpdateProducts } from "@/features/admin/catalog-actions";
import { setProductsFlag } from "@/features/flags/actions";
import type { ProductFlag } from "@/features/flags/types";
import { setProductsRarity } from "@/features/rarities/actions";
import type { RarityEffect } from "@/features/rarities/types";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/format";
import { storageImageUrl } from "@/lib/images";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  isReference: boolean;
  brand: string | null;
  category: string;
  image: string | null;
  rarity: { id: string; name: string; color: string; effect: RarityEffect } | null;
  flag: Pick<ProductFlag, "name" | "color" | "logoPath" | "showName"> | null;
};

type Option = { id: string; name: string };

/** Selector + botón para asignar (o quitar) un valor a todos los seleccionados. */
function BulkAssign({
  id,
  label,
  placeholder,
  clearLabel,
  options,
  disabled,
  Icon,
  onApply,
}: {
  id: string;
  label: string;
  placeholder: string;
  clearLabel: string;
  options: Option[];
  disabled: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  onApply: (choice: string) => void;
}) {
  const [choice, setChoice] = useState("");
  if (!options.length) return null;
  return (
    <span className="flex items-center gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        className={cn(fieldBase, "h-8 w-36 px-2 text-sm")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        <option value="none">{clearLabel}</option>
      </select>
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled || !choice}
        onClick={() => onApply(choice)}
      >
        <Icon aria-hidden />
        Aplicar
      </Button>
    </span>
  );
}

type Change = "show" | "hide" | "feature" | "unfeature";

const CHANGE_DONE: Record<Change, string> = {
  show: "visibles en la tienda",
  hide: "ocultos",
  feature: "destacados",
  unfeature: "sin destacar",
};

/** Tabla de productos con selección para mostrar, ocultar, destacar o eliminar varios a la vez. */
export function ProductsTable({
  products,
  rarities,
  flags,
}: {
  products: ProductRow[];
  rarities: Option[];
  flags: Option[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  // Si la página cambia (filtro, paginación), se descartan ids que ya no están.
  const visibleIds = new Set(products.map((product) => product.id));
  const chosen = [...selected].filter((id) => visibleIds.has(id));
  const allSelected = chosen.length === products.length && products.length > 0;

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
    setConfirmingDelete(false);
    setReason("");
  }

  function update(change: Change) {
    startTransition(async () => {
      const result = await bulkUpdateProducts({ ids: chosen, change });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        `${result.data.updated} ${result.data.updated === 1 ? "producto" : "productos"} ${CHANGE_DONE[change]}`,
      );
      clear();
      router.refresh();
    });
  }

  function assign(kind: "rarity" | "flag", choice: string) {
    startTransition(async () => {
      const value = choice === "none" ? null : choice;
      const result =
        kind === "rarity"
          ? await setProductsRarity({ ids: chosen, rarityId: value })
          : await setProductsFlag({ ids: chosen, flagId: value });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const label = kind === "rarity" ? "Rareza" : "Etiqueta";
      const name = (kind === "rarity" ? rarities : flags).find((item) => item.id === value)?.name;
      const count = `${result.data.updated} ${result.data.updated === 1 ? "producto" : "productos"}`;
      toast.success(
        name ? `${label} «${name}» asignada a ${count}` : `${label} quitada de ${count}`,
      );
      clear();
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await bulkDeleteProducts({ ids: chosen, reason: reason || undefined });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const { deleted, failed } = result.data;
      if (deleted) {
        toast.success(
          `${deleted} ${deleted === 1 ? "producto eliminado" : "productos eliminados"}. Quedó en la actividad.`,
        );
      }
      if (failed.length) {
        toast.error(
          `${failed.length} no se ${failed.length === 1 ? "pudo" : "pudieron"} eliminar: están en pedidos sin cerrar.`,
        );
      }
      clear();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      {chosen.length > 0 && (
        <div
          role="region"
          aria-label="Acciones para los productos seleccionados"
          className="sticky top-20 z-20 grid gap-3 rounded-xl border border-primary/40 bg-card p-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-semibold">
              {chosen.length} {chosen.length === 1 ? "seleccionado" : "seleccionados"}
            </span>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => update("show")}>
              <EyeIcon aria-hidden />
              Mostrar
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => update("hide")}>
              <EyeOffIcon aria-hidden />
              Ocultar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => update("feature")}
            >
              <StarIcon aria-hidden />
              Destacar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => update("unfeature")}
            >
              <StarOffIcon aria-hidden />
              Quitar destacado
            </Button>
            <BulkAssign
              id="bulk-rarity"
              label="Rareza para los seleccionados"
              placeholder="Rareza…"
              clearLabel="Quitar rareza"
              options={rarities}
              disabled={pending}
              Icon={GemIcon}
              onApply={(choice) => assign("rarity", choice)}
            />
            <BulkAssign
              id="bulk-flag"
              label="Etiqueta para los seleccionados"
              placeholder="Etiqueta…"
              clearLabel="Quitar etiqueta"
              options={flags}
              disabled={pending}
              Icon={FlagIcon}
              onApply={(choice) => assign("flag", choice)}
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2Icon aria-hidden />
              Eliminar
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={clear}>
              <XIcon aria-hidden />
              <span className="sr-only">Quitar selección</span>
            </Button>
          </div>
          {confirmingDelete && (
            <div
              role="alertdialog"
              aria-labelledby="bulk-delete-title"
              className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
            >
              <p id="bulk-delete-title" className="text-sm">
                <strong>
                  ¿Eliminar {chosen.length} {chosen.length === 1 ? "producto" : "productos"}?
                </strong>{" "}
                Se borran con sus imágenes; pedidos, movimientos e historial se conservan. No se
                puede deshacer.
              </p>
              <ReasonInput id="bulk-delete-reason" value={reason} onChange={setReason} />
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" isLoading={pending} onClick={remove}>
                  Sí, eliminar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AdminTable caption="Productos">
        <thead>
          <tr>
            <AdminTh className="w-10">
              <Checkbox
                aria-label="Seleccionar todos los productos de esta página"
                checked={allSelected}
                onCheckedChange={(value) =>
                  setSelected(value === true ? new Set(products.map((p) => p.id)) : new Set())
                }
              />
            </AdminTh>
            <AdminTh>Producto</AdminTh>
            <AdminTh>Categoría</AdminTh>
            <AdminTh className="text-right">Precio</AdminTh>
            <AdminTh>Stock</AdminTh>
            <AdminTh>Estado</AdminTh>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isSelected = selected.has(product.id);
            return (
              <tr
                key={product.id}
                data-selected={isSelected || undefined}
                className="data-selected:bg-primary-soft/40"
              >
                <td>
                  <Checkbox
                    aria-label={`Seleccionar ${product.name}`}
                    checked={isSelected}
                    onCheckedChange={(value) => toggle(product.id, value === true)}
                  />
                </td>
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
                      {(product.rarity || product.flag) && (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {product.flag && (
                            <ProductFlagTag flag={product.flag} className="rounded-l-sm" />
                          )}
                          {product.rarity && <RarityBadge rarity={product.rarity} />}
                        </span>
                      )}
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
                    {product.isReference ? (
                      <Badge variant="soft" title="No se vende aquí: aparece en Arma tu PC">
                        Referencia
                      </Badge>
                    ) : (
                      <Badge variant={product.isActive ? "success" : "outline"}>
                        {product.isActive ? "Visible" : "Oculto"}
                      </Badge>
                    )}
                    {product.isFeatured && <Badge variant="soft">Destacado</Badge>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
    </div>
  );
}
