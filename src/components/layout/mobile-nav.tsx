"use client";

import {
  ChevronDownIcon,
  HeadsetIcon,
  InfoIcon,
  LayoutGridIcon,
  MenuIcon,
  SparklesIcon,
  TagIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { CategoryIllustration } from "@/components/shop/category-illustration";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "./mega-menu";
import { ThemeSwitch } from "./theme-switch";

const QUICK_LINKS = [
  { href: "/productos?oferta=1", label: "Ofertas", Icon: TagIcon, sale: true },
  { href: "/productos?orden=newest", label: "Recién agregados", Icon: SparklesIcon, sale: false },
  { href: "/productos", label: "Todo el catálogo", Icon: LayoutGridIcon, sale: false },
  { href: "/nosotros", label: "Sobre nosotros", Icon: InfoIcon, sale: false },
  { href: "/soporte", label: "Soporte", Icon: HeadsetIcon, sale: false },
] as const;

const itemClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] transition-colors hover:bg-secondary";

/** Menú lateral para móvil: accesos, categorías desplegables y cambio de tema. */
export function MobileNav({ categories }: { categories: MenuCategory[] }) {
  // La ruta actual solo marca la categoría activa: mientras llega, el menú ya funciona.
  return (
    <Suspense fallback={<MobileNavView categories={categories} pathname="" />}>
      <MobileNavWithPath categories={categories} />
    </Suspense>
  );
}

function MobileNavWithPath({ categories }: { categories: MenuCategory[] }) {
  return <MobileNavView categories={categories} pathname={usePathname()} />;
}

function MobileNavView({ categories, pathname }: { categories: MenuCategory[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="font-heading font-stretch-112%">Menú</SheetTitle>
          <SheetDescription className="sr-only">
            Categorías y secciones de la tienda
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label="Menú móvil"
          className="grid flex-1 content-start gap-6 overflow-y-auto p-3"
        >
          <ul className="grid gap-0.5">
            {QUICK_LINKS.map(({ href, label, Icon, sale }) => (
              <li key={href}>
                <Link
                  href={href as Route}
                  onClick={close}
                  className={cn(itemClass, "font-semibold", sale && "text-sale")}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 0 && (
            <div className="grid gap-1">
              <p className="px-3 pb-1 text-eyebrow text-muted-foreground">Categorías</p>
              <ul className="grid gap-0.5">
                {categories.map((category) => {
                  const href = `/categorias/${category.slug}`;
                  const active = pathname === href;
                  const link = (
                    <Link
                      href={href as Route}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        itemClass,
                        "flex-1 aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary",
                      )}
                    >
                      <CategoryIllustration
                        categorySlug={category.slug}
                        className="w-7 shrink-0 text-muted-foreground"
                      />
                      {category.name}
                    </Link>
                  );
                  if (!category.children.length) return <li key={category.slug}>{link}</li>;
                  return (
                    <li key={category.slug}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center rounded-lg pr-2 hover:bg-secondary [&::-webkit-details-marker]:hidden">
                          <span className={cn(itemClass, "flex-1 hover:bg-transparent")}>
                            <CategoryIllustration
                              categorySlug={category.slug}
                              className="w-7 shrink-0 text-muted-foreground"
                            />
                            {category.name}
                          </span>
                          <ChevronDownIcon
                            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                            aria-hidden
                          />
                        </summary>
                        <ul className="grid gap-0.5 pb-1 pl-12">
                          <li>
                            <Link
                              href={href as Route}
                              onClick={close}
                              className={cn(itemClass, "py-2 text-sm font-semibold")}
                            >
                              Ver todo en {category.name}
                            </Link>
                          </li>
                          {category.children.map((child) => (
                            <li key={child.slug}>
                              <Link
                                href={`/categorias/${child.slug}` as Route}
                                onClick={close}
                                className={cn(itemClass, "py-2 text-sm text-muted-foreground")}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
        <div className="flex items-center justify-between gap-3 border-t p-4">
          <span className="text-sm text-muted-foreground">Apariencia</span>
          <ThemeSwitch showLabel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
