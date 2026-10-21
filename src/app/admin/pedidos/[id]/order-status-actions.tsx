"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeOrderStatus } from "@/features/admin/order-actions";
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  TRANSITION_ACTION_LABELS,
  type OrderStatus,
} from "@/features/orders/transitions";

type Target = Exclude<OrderStatus, "pending">;

/** Botones para avanzar el pedido. Cancelar pide confirmación (devuelve stock). */
export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Target | null>(null);
  const next = ORDER_TRANSITIONS[status].filter((value): value is Target => value !== "pending");

  if (!next.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Este pedido está {ORDER_STATUS_LABELS[status].toLowerCase()} y ya no admite cambios.
      </p>
    );
  }

  function apply(value: Target) {
    setTarget(value);
    startTransition(async () => {
      const result = await changeOrderStatus({ orderId, status: value, note: note || undefined });
      if (result.ok) {
        toast.success(`Pedido: ${ORDER_STATUS_LABELS[value].toLowerCase()}`);
        setNote("");
        setConfirmCancel(false);
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
      setTarget(null);
    });
  }

  const forward = next.filter((value) => value !== "cancelled");
  const canCancel = next.includes("cancelled");

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="status-note" className="font-semibold">
          Nota interna <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="status-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="Ej.: pago confirmado por transferencia, guía 123456…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {forward.map((value) => (
          <Button
            key={value}
            onClick={() => apply(value)}
            disabled={pending}
            isLoading={pending && target === value}
          >
            {TRANSITION_ACTION_LABELS[value]}
          </Button>
        ))}
        {canCancel && !confirmCancel && (
          <Button variant="destructive" onClick={() => setConfirmCancel(true)} disabled={pending}>
            Cancelar pedido
          </Button>
        )}
      </div>
      {confirmCancel && (
        <div
          role="alertdialog"
          aria-labelledby="cancel-title"
          className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
        >
          <p id="cancel-title" className="text-sm">
            <strong>¿Cancelar el pedido?</strong> Las unidades vuelven al inventario y el cambio no
            se puede deshacer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => apply("cancelled")}
              disabled={pending}
              isLoading={pending && target === "cancelled"}
            >
              Sí, cancelar pedido
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={pending}>
              No, volver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
