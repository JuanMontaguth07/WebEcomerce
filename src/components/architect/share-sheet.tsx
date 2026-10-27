"use client";

import { CheckIcon, CopyIcon, MessageCircleIcon, Share2Icon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type SavedLink = { code: string; name: string; url: string };

/**
 * Guardar y compartir: se le pone nombre, se guarda (versión nueva) y queda un
 * enlace para copiar, compartir o pedir la cotización por WhatsApp.
 */
export function ShareSheet({
  open,
  onOpenChange,
  intent,
  saved,
  defaultName,
  onSave,
  quoteHref,
  shareHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «quote» destaca la cotización por WhatsApp. */
  intent: "share" | "quote";
  /** El enlace de lo guardado, si no hubo cambios desde entonces. */
  saved: SavedLink | null;
  defaultName: string;
  onSave: (name: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** WhatsApp de la tienda con el resumen (null si la tienda no tiene número). */
  quoteHref: string | null;
  shareHref: string | null;
}) {
  const id = useId();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSave(name);
      if (!result.ok) setError(result.message);
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: se selecciona el texto para copiarlo a mano.
      (document.getElementById(`${id}-url`) as HTMLInputElement | null)?.select();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-heading font-stretch-112%">
            {intent === "quote" ? "Pedir cotización" : "Guardar y compartir"}
          </SheetTitle>
          <SheetDescription>
            {saved
              ? "Tu configuración está guardada con este enlace."
              : "Se guarda con un enlace propio que puedes abrir desde cualquier lugar."}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 p-5">
          {saved ? (
            <>
              <div className="grid gap-2">
                <label htmlFor={`${id}-url`} className="text-sm font-semibold">
                  Enlace de «{saved.name}»
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${id}-url`}
                    readOnly
                    value={saved.url}
                    onFocus={(event) => event.target.select()}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-xs"
                  />
                  <Button type="button" variant="secondary" onClick={() => copy(saved.url)}>
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {quoteHref && (
                  <Button asChild size="lg" variant={intent === "quote" ? "default" : "secondary"}>
                    <a href={quoteHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircleIcon aria-hidden />
                      Pedir cotización por WhatsApp
                      <span className="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  </Button>
                )}
                {shareHref && (
                  <Button asChild size="lg" variant={intent === "share" ? "default" : "secondary"}>
                    <a href={shareHref} target="_blank" rel="noopener noreferrer">
                      <Share2Icon aria-hidden />
                      Compartir por WhatsApp
                      <span className="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  </Button>
                )}
              </div>
              {intent === "quote" && !quoteHref && (
                <p className="text-sm text-muted-foreground">
                  La tienda aún no tiene un WhatsApp configurado. Puedes compartir el enlace por el
                  medio que prefieras.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Quedó en «Mis configuraciones» de este navegador. Si cambias alguna pieza, guarda de
                nuevo: cada guardado es una versión nueva y la anterior no cambia.
              </p>
            </>
          ) : (
            <form onSubmit={save} className="grid gap-4" noValidate>
              <div className="grid gap-2">
                <label htmlFor={`${id}-name`} className="text-sm font-semibold">
                  Nombre de la configuración
                </label>
                <input
                  id={`${id}-name`}
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm aria-invalid:border-destructive"
                />
                {error && (
                  <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" size="lg" isLoading={pending}>
                Guardar y obtener enlace
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
