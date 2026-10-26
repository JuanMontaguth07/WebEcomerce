"use client";

import { CopyPlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ReasonInput } from "@/components/admin/reason-input";
import { Button } from "@/components/ui/button";
import { deleteProduct, duplicateProduct } from "@/features/admin/catalog-actions";

export function DuplicateProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      isLoading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await duplicateProduct({ id: productId });
          if (!result.ok) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Copia creada como borrador oculto");
          router.push(`/admin/productos/${result.data.id}`);
        })
      }
    >
      <CopyPlusIcon aria-hidden />
      Duplicar
    </Button>
  );
}

/**
 * Eliminar con confirmación y motivo. Los pedidos, movimientos e historial del
 * producto se conservan con su nombre y SKU.
 */
export function DeleteProductPanel({
  productId,
  productName,
  stock,
  orderCount,
  movementCount,
}: {
  productId: string;
  productName: string;
  stock: number;
  orderCount: number;
  movementCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const hasHistory = orderCount > 0 || movementCount > 0;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {hasHistory
          ? `Tiene ${orderCount} ${orderCount === 1 ? "pedido" : "pedidos"} y ${movementCount} ${movementCount === 1 ? "movimiento" : "movimientos"} de inventario. Si lo eliminas, esos registros se conservan con su nombre y SKU, y el borrado queda en la actividad.`
          : "Sin pedidos ni movimientos. El borrado queda registrado en la actividad."}{" "}
        Si solo quieres retirarlo de la tienda, desmarca «Visible en la tienda».
      </p>

      {!confirming ? (
        <Button
          type="button"
          variant="destructive"
          className="w-fit"
          onClick={() => setConfirming(true)}
        >
          <Trash2Icon aria-hidden />
          Eliminar producto
        </Button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="delete-product-title"
          className="grid gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
        >
          <p id="delete-product-title" className="text-sm">
            <strong>¿Eliminar «{productName}»?</strong> Se borran sus imágenes y su ficha.
            {stock > 0 &&
              ` Las ${stock} ${stock === 1 ? "unidad sale" : "unidades salen"} del inventario con un movimiento.`}{" "}
            No se puede deshacer.
          </p>
          <ReasonInput id="delete-reason" value={reason} onChange={setReason} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              isLoading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteProduct({
                    id: productId,
                    reason: reason || undefined,
                  });
                  if (result.ok) {
                    toast.success("Producto eliminado. El registro quedó en la actividad.");
                    router.push("/admin/productos");
                  } else {
                    toast.error(result.error.message);
                  }
                })
              }
            >
              Sí, eliminar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
