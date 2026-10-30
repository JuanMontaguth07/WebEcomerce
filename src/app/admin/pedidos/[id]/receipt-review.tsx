"use client";

import { CheckIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dateTime } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import type { AdminReceipt } from "@/features/admin/receipts";
import { reviewPaymentReceipt } from "@/features/admin/order-actions";
import { cn } from "@/lib/utils";

const STATUS: Record<AdminReceipt["status"], { label: string; className: string }> = {
  pending: { label: "Por revisar", className: "bg-warning/10 text-warning" },
  approved: { label: "Aprobado", className: "bg-success/10 text-success" },
  rejected: { label: "Rechazado", className: "bg-destructive/10 text-destructive" },
  replaced: { label: "Reemplazado", className: "bg-secondary text-muted-foreground" },
};

/**
 * Comprobantes que subió el cliente: el último grande, con aprobar (confirma el
 * pedido) o rechazar con un motivo que el cliente ve en su pedido.
 */
export function ReceiptReview({
  orderId,
  receipts,
  total,
}: {
  orderId: string;
  receipts: AdminReceipt[];
  total: string;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [latest, ...older] = receipts;
  if (!latest) return null;
  const src = (id: string) => `/admin/pedidos/${orderId}/comprobante/${id}`;

  function review(approve: boolean) {
    startTransition(async () => {
      const result = await reviewPaymentReceipt({
        receiptId: latest!.id,
        approve,
        note: approve ? undefined : reason,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        approve ? "Pago aprobado: el pedido quedó confirmado" : "Comprobante rechazado",
      );
      setRejecting(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <a
        href={src(latest.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-xl border bg-secondary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen privada: la sirve el panel, no el optimizador */}
        <img
          src={src(latest.id)}
          alt={`Comprobante de pago enviado el ${dateTime.format(new Date(latest.createdAt))}`}
          width={latest.width ?? undefined}
          height={latest.height ?? undefined}
          className="max-h-96 w-full object-contain"
        />
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
          <ExternalLinkIcon className="size-3.5" aria-hidden />
          Ver en grande
        </span>
      </a>

      <div className="grid gap-1 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              STATUS[latest.status].className,
            )}
          >
            {STATUS[latest.status].label}
          </span>
          <span className="text-muted-foreground">
            Enviado el {dateTime.format(new Date(latest.createdAt))}
          </span>
        </p>
        {latest.note && (
          <p className="rounded-lg bg-secondary px-3 py-2">
            <span className="text-muted-foreground">El cliente dice:</span> {latest.note}
          </p>
        )}
        {latest.status !== "pending" && latest.reviewedAt && (
          <p className="text-muted-foreground">
            {latest.status === "approved" ? "Aprobado" : "Rechazado"} por{" "}
            {latest.reviewer ?? "un admin"} el {dateTime.format(new Date(latest.reviewedAt))}
            {latest.reviewNote ? ` · «${latest.reviewNote}»` : ""}
          </p>
        )}
      </div>

      {latest.status === "pending" &&
        (rejecting ? (
          <div className="grid gap-2">
            <label htmlFor="motivo-rechazo" className="text-sm font-medium">
              ¿Por qué lo rechazas? El cliente lo verá en su pedido.
            </label>
            <textarea
              id="motivo-rechazo"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={`Por ejemplo: el valor no coincide con ${total}.`}
              className="resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                isLoading={pending}
                disabled={reason.trim().length < 3}
                onClick={() => review(false)}
              >
                Rechazar comprobante
              </Button>
              <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Revisa en tu Nequi que llegó la transferencia de <strong>{total}</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" isLoading={pending} onClick={() => review(true)}>
                <CheckIcon aria-hidden />
                Aprobar y confirmar pedido
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRejecting(true)}>
                <XIcon aria-hidden />
                Rechazar
              </Button>
            </div>
          </div>
        ))}

      {older.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {older.length} {older.length === 1 ? "envío anterior" : "envíos anteriores"}
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {older.map((receipt) => (
              <li key={receipt.id} className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    STATUS[receipt.status].className,
                  )}
                >
                  {STATUS[receipt.status].label}
                </span>
                <a
                  href={src(receipt.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {dateTime.format(new Date(receipt.createdAt))}
                </a>
                {receipt.reviewNote && (
                  <span className="text-muted-foreground">· {receipt.reviewNote}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
