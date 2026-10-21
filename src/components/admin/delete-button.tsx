"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Eliminar con confirmación en línea. Si la base lo impide, muestra el motivo. */
export function DeleteButton({
  label,
  confirmText,
  action,
  redirectTo,
}: {
  label: string;
  confirmText: string;
  action: () => Promise<{ ok: true } | { ok: false; error: { message: string } }>;
  redirectTo: Route;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={label}
      className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
    >
      <p className="text-sm">{confirmText}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          isLoading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await action();
              if (result.ok) {
                toast.success("Eliminado");
                router.push(redirectTo);
              } else {
                toast.error(result.error.message);
                setConfirming(false);
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
  );
}
