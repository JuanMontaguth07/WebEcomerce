"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CategoryRef } from "@/features/catalog/types";

/** Menú lateral para móvil con las categorías y accesos principales. */
export function MobileNav({ categories }: { categories: CategoryRef[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="font-heading font-stretch-112%">Menú</SheetTitle>
          <SheetDescription className="sr-only">
            Categorías y secciones de la tienda
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Menú móvil" className="grid gap-6 overflow-y-auto p-4">
          <ul className="grid gap-1">
            <li>
              <Link
                href="/productos"
                onClick={close}
                className="block rounded-md px-3 py-2.5 font-semibold hover:bg-secondary"
              >
                Todos los productos
              </Link>
            </li>
            <li>
              <Link
                href="/productos?oferta=1"
                onClick={close}
                className="block rounded-md px-3 py-2.5 font-semibold hover:bg-secondary"
              >
                Ofertas
              </Link>
            </li>
          </ul>
          <div className="grid gap-1">
            <p className="px-3 pb-1 text-eyebrow text-muted-foreground">Categorías</p>
            <ul className="grid gap-0.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categorias/${category.slug}`}
                    onClick={close}
                    className="block rounded-md px-3 py-2.5 hover:bg-secondary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
