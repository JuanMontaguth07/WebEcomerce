"use client";

import { FolderOpenIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSavedBuilds } from "@/features/architect/saved-store";
import { formatCOP } from "@/lib/format";

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/** «Mis configuraciones»: las guardadas desde este navegador, con su enlace. */
export function MyBuildsButton() {
  const { entries, remove } = useSavedBuilds();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FolderOpenIcon aria-hidden />
        Mis configuraciones{entries.length > 0 && ` (${entries.length})`}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          <SheetHeader className="border-b p-5">
            <SheetTitle className="font-heading font-stretch-112%">Mis configuraciones</SheetTitle>
            <SheetDescription>
              Las que guardaste desde este navegador. Cada una se abre con su enlace desde cualquier
              lugar.
            </SheetDescription>
          </SheetHeader>
          {entries.length ? (
            <ul className="grid divide-y">
              {entries.map((entry) => (
                <li key={entry.code} className="flex items-center gap-3 p-4">
                  <Link
                    href={`/arma-tu-pc/${entry.code}`}
                    onClick={() => setOpen(false)}
                    className="grid min-w-0 flex-1 gap-0.5 rounded-md outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <span className="truncate font-semibold">{entry.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCOP(entry.total)} · {dateFormat.format(new Date(entry.savedAt))}
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar «${entry.name}» de la lista`}
                    onClick={() => remove(entry.code)}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Todavía no guardaste configuraciones en este navegador. Arma un equipo y usa «Guardar
              y compartir».
            </p>
          )}
          {entries.length > 0 && (
            <p className="border-t p-5 text-xs text-muted-foreground">
              Quitar una de la lista no borra su enlace: quien lo tenga la puede seguir abriendo.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
