"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TextField } from "@/components/admin/form-helpers";
import { Button } from "@/components/ui/button";
import { setOrderShipping } from "@/features/admin/order-actions";
import { formatCOP } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;

/**
 * Fija o corrige el valor del envío. El total se recalcula y el cliente lo ve
 * de inmediato en la página de su pedido (también en las instrucciones de pago).
 */
export function ShippingEditor({
  orderId,
  subtotal,
  shippingCost,
  suggested,
}: {
  orderId: string;
  subtotal: number;
  shippingCost: number | null;
  /** Tarifa configurada para el destino, si existe. */
  suggested: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(shippingCost === null ? "" : String(shippingCost));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const parsed = /^\d+$/.test(value) ? Number(value) : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await setOrderShipping({ orderId, shippingCost: value });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      toast.success(`Envío guardado. Nuevo total: ${formatCOP(result.data.total)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      <TextField
        name="shippingCost"
        label={shippingCost === null ? "Valor del envío (por confirmar)" : "Valor del envío"}
        errors={errors}
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        hint={
          parsed !== null
            ? `Total con este envío: ${formatCOP(subtotal + parsed)}. Escribe 0 si es gratis.`
            : "En pesos, sin puntos. Escribe 0 si es gratis."
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" isLoading={pending} disabled={parsed === null}>
          Guardar envío
        </Button>
        {suggested !== null && suggested !== parsed && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setValue(String(suggested))}
          >
            Usar tarifa configurada ({formatCOP(suggested)})
          </Button>
        )}
      </div>
    </form>
  );
}
