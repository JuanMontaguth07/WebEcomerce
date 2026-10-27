"use client";

import { ArrowRightIcon, ChevronDownIcon, CpuIcon, SparklesIcon, TagIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NavigationMenu } from "radix-ui";
import { CategoryIllustration } from "@/components/shop/category-illustration";
import { cn } from "@/lib/utils";

export type MenuCategory = {
  name: string;
  slug: string;
  children: { name: string; slug: string }[];
};

export type MenuBrand = { name: string; slug: string };

const QUICK_LINKS = [
  { href: "/arma-tu-pc", label: "Arma tu PC", Icon: CpuIcon, sale: false },
  { href: "/productos?oferta=1", label: "Ofertas", Icon: TagIcon, sale: true },
  { href: "/productos?orden=newest", label: "Recién agregados", Icon: SparklesIcon, sale: false },
  { href: "/productos", label: "Todo el catálogo", Icon: ArrowRightIcon, sale: false },
] as const;

/**
 * Mega menú de categorías (escritorio). Radix NavigationMenu da navegación por
 * teclado, cierre con Esc y manejo del foco. El panel ocupa el ancho del
 * encabezado: el contenedor del encabezado es la referencia de posición.
 */
type MegaMenuProps = { categories: MenuCategory[]; brands: MenuBrand[] };

export function MegaMenu(props: MegaMenuProps) {
  // La ruta actual solo marca la categoría activa: mientras llega, el menú ya funciona.
  return (
    <Suspense fallback={<MegaMenuView {...props} pathname="" />}>
      <MegaMenuWithPath {...props} />
    </Suspense>
  );
}

function MegaMenuWithPath(props: MegaMenuProps) {
  return <MegaMenuView {...props} pathname={usePathname()} />;
}

function MegaMenuView({ categories, brands, pathname }: MegaMenuProps & { pathname: string }) {
  const inCategory = pathname.startsWith("/categorias/");

  if (!categories.length) return null;

  return (
    <NavigationMenu.Root
      aria-label="Menú de categorías"
      className="static hidden lg:block"
      delayDuration={80}
    >
      <NavigationMenu.List className="flex items-center">
        <NavigationMenu.Item className="static">
          <NavigationMenu.Trigger
            aria-current={inCategory ? "true" : undefined}
            className="group inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40 aria-[current]:text-primary data-[state=open]:bg-secondary"
          >
            Categorías
            <ChevronDownIcon
              className="size-4 transition-transform duration-300 ease-out-soft group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-full">
            <div className="grid gap-6 p-6 xl:grid-cols-[1fr_16rem]">
              <ul className="grid grid-cols-3 content-start gap-2 xl:grid-cols-4">
                {categories.map((category) => {
                  const href = `/categorias/${category.slug}`;
                  const active = pathname === href;
                  return (
                    <li key={category.slug} className="grid content-start gap-1">
                      <NavigationMenu.Link asChild active={active}>
                        <Link
                          href={href as Route}
                          className="group/cat flex items-center gap-3 rounded-xl p-2.5 transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary data-[active]:bg-primary-soft"
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover/cat:border-primary/50 group-hover/cat:text-primary">
                            <CategoryIllustration categorySlug={category.slug} className="w-9" />
                          </span>
                          <span className="text-sm font-semibold group-data-[active]/cat:text-primary">
                            {category.name}
                          </span>
                        </Link>
                      </NavigationMenu.Link>
                      {category.children.length > 0 && (
                        <ul className="grid gap-0.5 pl-16">
                          {category.children.slice(0, 5).map((child) => (
                            <li key={child.slug}>
                              <NavigationMenu.Link asChild>
                                <Link
                                  href={`/categorias/${child.slug}` as Route}
                                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                  {child.name}
                                </Link>
                              </NavigationMenu.Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="grid content-start gap-5 border-t pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
                <ul className="grid gap-1">
                  {QUICK_LINKS.map(({ href, label, Icon, sale }) => (
                    <li key={href}>
                      <NavigationMenu.Link asChild>
                        <Link
                          href={href as Route}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-secondary",
                            sale && "text-sale",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          {label}
                        </Link>
                      </NavigationMenu.Link>
                    </li>
                  ))}
                </ul>
                {brands.length > 0 && (
                  <div className="grid gap-2">
                    <p className="px-3 text-eyebrow text-muted-foreground">Marcas</p>
                    <ul className="flex flex-wrap gap-1.5 px-3">
                      {brands.slice(0, 12).map((brand) => (
                        <li key={brand.slug}>
                          <NavigationMenu.Link asChild>
                            <Link
                              href={`/marcas/${brand.slug}` as Route}
                              className="inline-flex rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/60 hover:text-primary"
                            >
                              {brand.name}
                            </Link>
                          </NavigationMenu.Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      {/* Radix envuelve la lista en un contenedor relativo: el panel va en el Viewport,
          posicionado respecto al encabezado para ocupar todo su ancho. */}
      <div className="pointer-events-none absolute inset-x-4 top-full z-50 mt-2 md:inset-x-6 xl:inset-x-8">
        <NavigationMenu.Viewport className="pointer-events-auto relative h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-raised transition-[height] duration-300 ease-out-soft data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2" />
      </div>
    </NavigationMenu.Root>
  );
}
