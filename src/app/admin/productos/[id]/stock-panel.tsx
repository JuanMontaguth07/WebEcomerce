"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SelectField, TextField } from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { adjustStock } from "@/features/inventory/actions";
import { MOVEMENT_LABELS } from "@/features/inventory/schemas";

type Errors = Partial<Record<string, string[]>>;

const TYPES = [
  { value: "restock", label: `${MOVEMENT_LABELS.restock} (suma)` },
  { value: "initial", label: `${MOVEMENT_LABELS.initial} (suma)` },
  { value: "return", label: `${MOVEMENT_LABELS.return} (suma)` },
  { value: "adjustment", label: `${MOVEMENT_LABELS.adjustment} (+/−)` },
] as const;

export function StockPanel({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("restock");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await adjustStock({
        productId,
        movementType: type,
        quantity: quantity as unknown as number,
        reason: reason || undefined,
      });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      setQuantity("");
      setReason("");
      toast.success(`Stock actualizado: ${result.data.stock} unidades`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3 rounded-lg bg-secondary px-4 py-3">
        <span className="text-sm text-muted-foreground">Stock actual</span>
        <span className="font-heading text-2xl font-bold font-stretch-112% tabular-nums">
          {stock}
        </span>
      </div>
      <SelectField
        name="movementType"
        label="Tipo de movimiento"
        errors={errors}
        value={type}
        onChange={(event) => setType(event.target.value as typeof type)}
        options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
      />
      <TextField
        name="quantity"
        label="Cantidad"
        errors={errors}
        inputMode="numeric"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value.replace(/[^\d-]/g, ""))}
        hint={
          type === "adjustment"
            ? "Usa un número negativo para restar (ej.: -2)."
            : "Unidades que ingresan."
        }
      />
      <TextField
        name="reason"
        label="Motivo"
        optional={type !== "adjustment"}
        errors={errors}
        maxLength={300}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={
          type === "adjustment"
            ? "Ej.: conteo físico, producto dañado"
            : "Ej.: factura proveedor 123"
        }
      />
      <Button type="submit" isLoading={pending}>
        Registrar movimiento
      </Button>
    </form>
  );
}
