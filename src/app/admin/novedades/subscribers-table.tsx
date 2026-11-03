"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { dateTime } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSubscriber } from "@/features/newsletter/actions";
import type { Subscriber } from "@/features/newsletter/queries";
import { SOURCE_LABELS } from "@/features/newsletter/types";

/** La lista con búsqueda y la opción de borrar un correo (si el titular lo pide). */
export function SubscribersTable({ subscribers }: { subscribers: Subscriber[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const search = query.trim().toLowerCase();
  const shown = search ? subscribers.filter((item) => item.email.includes(search)) : subscribers;

  function remove(item: Subscriber) {
    startTransition(async () => {
      const result = await deleteSubscriber({ id: item.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setConfirming(null);
      toast.success(`Borrado: ${item.email}`);
      router.refresh();
    });
  }

  if (!subscribers.length) {
    return (
      <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        Nadie se ha suscrito todavía. La suscripción está en Arma tu PC y en el pie de página de la
        tienda.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar un correo"
        aria-label="Buscar un correo"
        className="h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Desde</th>
              <th className="px-4 py-3 font-medium">Autorizó</th>
              <th className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium break-all">{item.email}</td>
                <td className="px-4 py-3">
                  {item.status === "active" ? (
                    <Badge variant="soft">Activo</Badge>
                  ) : (
                    <Badge variant="outline">
                      De baja
                      {item.unsubscribedAt &&
                        ` · ${dateTime.format(new Date(item.unsubscribedAt))}`}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {SOURCE_LABELS[item.source] ?? item.source}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {dateTime.format(new Date(item.consentedAt))}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {confirming === item.id ? (
                    <span className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        isLoading={pending}
                        onClick={() => remove(item)}
                      >
                        Borrar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                      >
                        Cancelar
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Borrar ${item.email}`}
                      title="Borrar (si el titular pide suprimir sus datos)"
                      onClick={() => setConfirming(item.id)}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {search && !shown.length && (
        <p className="text-sm text-muted-foreground">Ningún correo coincide con «{query}».</p>
      )}
    </div>
  );
}
