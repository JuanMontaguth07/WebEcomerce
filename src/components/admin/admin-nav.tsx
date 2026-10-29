"use client";

import {
  BoxesIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  FlagIcon,
  FolderTreeIcon,
  GemIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  SettingsIcon,
  TagIcon,
  TruckIcon,
  UserCogIcon,
  WarehouseIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ModuleTile, type TileTone } from "./module-tile";
import { useSidebar } from "./sidebar";

export type AdminNavItem = {
  href: Route;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Color del módulo: su ícono en el menú y en el encabezado de sus páginas. */
  tone: TileTone;
  exact?: boolean;
  /** Palabras extra para encontrarla en la paleta de comandos. */
  keywords?: string;
};

/** Secciones del panel. También alimentan la paleta de comandos (Ctrl+K). */
export const ADMIN_NAV: { title: string | null; items: AdminNavItem[] }[] = [
  {
    title: null,
    items: [
      {
        href: "/admin",
        label: "Resumen",
        Icon: LayoutDashboardIcon,
        tone: "indigo",
        exact: true,
        keywords: "inicio ventas",
      },
    ],
  },
  {
    title: "Ventas",
    items: [
      {
        href: "/admin/pedidos",
        label: "Pedidos",
        Icon: ClipboardListIcon,
        tone: "green",
        keywords: "ordenes compras pagos nequi",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      {
        href: "/admin/productos",
        label: "Productos",
        Icon: BoxesIcon,
        tone: "blue",
        keywords: "articulos",
      },
      {
        href: "/admin/rarezas",
        label: "Rarezas",
        Icon: GemIcon,
        tone: "violet",
        keywords: "calidad niveles efectos colores comun legendario",
      },
      {
        href: "/admin/etiquetas",
        label: "Etiquetas",
        Icon: FlagIcon,
        tone: "pink",
        keywords: "banderas marcas logos nvidia amd intel",
      },
      {
        href: "/admin/inventario",
        label: "Inventario",
        Icon: WarehouseIcon,
        tone: "amber",
        keywords: "stock movimientos",
      },
      { href: "/admin/categorias", label: "Categorías", Icon: FolderTreeIcon, tone: "teal" },
      { href: "/admin/marcas", label: "Marcas", Icon: TagIcon, tone: "orange" },
    ],
  },
  {
    title: "Tienda",
    items: [
      {
        href: "/admin/portada",
        label: "Portada",
        Icon: MegaphoneIcon,
        tone: "red",
        keywords: "anuncios banners inicio publicidad armamos asesoria",
      },
      {
        href: "/admin/envios",
        label: "Envíos",
        Icon: TruckIcon,
        tone: "sky",
        keywords: "tarifas ciudades",
      },
      {
        href: "/admin/configuracion",
        label: "Configuración",
        Icon: SettingsIcon,
        tone: "slate",
        keywords: "anuncio whatsapp nequi datos legales nit",
      },
      {
        href: "/admin/actividad",
        label: "Actividad",
        Icon: HistoryIcon,
        tone: "cyan",
        keywords: "historial cambios registro",
      },
      {
        href: "/admin/cuenta",
        label: "Mi cuenta",
        Icon: UserCogIcon,
        tone: "accent",
        keywords: "perfil contraseña tema oscuro claro color fuente cerrar sesion",
      },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** La sección a la que pertenece una ruta del panel (la más específica). */
export function moduleFor(pathname: string): AdminNavItem | undefined {
  return ALL_ITEMS.filter((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

// Con el menú contraído, solo el ícono (el nombre queda para lectores de pantalla).
const collapsedLink =
  "lg:group-data-[collapsed=true]/shell:justify-center lg:group-data-[collapsed=true]/shell:px-0";
const hideWhenCollapsed = "lg:group-data-[collapsed=true]/shell:sr-only";

const linkClass =
  "group/link relative z-[1] flex shrink-0 items-center gap-3 rounded-xl px-2 py-1.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdminNav({ pendingOrders }: { pendingOrders: number }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const navRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const active = moduleFor(pathname);

  // La marca de la sección activa se desliza hasta ella (también al contraer el menú).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const mark = markRef.current;
    if (!nav || !mark) return;
    const place = () => {
      const link = nav.querySelector<HTMLElement>("[aria-current=page]");
      if (!link) {
        mark.style.opacity = "0";
        return;
      }
      const frame = nav.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      mark.style.transform = `translate(${box.left - frame.left + nav.scrollLeft}px, ${box.top - frame.top + nav.scrollTop}px)`;
      mark.style.width = `${box.width}px`;
      mark.style.height = `${box.height}px`;
      mark.style.opacity = "1";
      // La primera vez aparece en su sitio; después se anima.
      requestAnimationFrame(() => (mark.dataset.ready = ""));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname, collapsed]);

  return (
    <nav
      ref={navRef}
      aria-label="Panel"
      className="relative -mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:gap-4 lg:overflow-visible"
    >
      <span
        ref={markRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 rounded-xl bg-card opacity-0 shadow-[0_6px_18px_-10px_rgb(0_0_0/0.5)] ring-1 ring-border motion-safe:data-[ready]:transition-[transform,width,height] motion-safe:data-[ready]:duration-300 motion-safe:data-[ready]:ease-out-soft"
      >
        <span className="absolute top-1/2 -left-1 hidden h-4 w-1 -translate-y-1/2 rounded-full bg-primary lg:block lg:group-data-[collapsed=true]/shell:hidden" />
      </span>
      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "inicio"} className="contents lg:grid lg:gap-0.5">
          {group.title && (
            <>
              <p
                className={cn(
                  "hidden px-2 pb-1 text-eyebrow font-mono text-muted-foreground lg:block",
                  "lg:group-data-[collapsed=true]/shell:hidden",
                )}
              >
                {group.title}
              </p>
              <span
                aria-hidden
                className="mx-auto mb-1 hidden h-px w-6 bg-border lg:group-data-[collapsed=true]/shell:block"
              />
            </>
          )}
          {group.items.map((item) => {
            const current = active?.href === item.href;
            const pending = item.href === "/admin/pedidos" && pendingOrders > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  linkClass,
                  collapsedLink,
                  current
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                <span className="relative">
                  <ModuleTile
                    tone={item.tone}
                    Icon={item.Icon}
                    className={cn(
                      "transition-[scale,filter] duration-200",
                      current
                        ? "scale-105"
                        : "saturate-[0.8] group-hover/link:scale-105 group-hover/link:saturate-100",
                    )}
                  />
                  {pending && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 hidden size-2.5 rounded-full bg-primary ring-2 ring-sidebar lg:group-data-[collapsed=true]/shell:block"
                    />
                  )}
                </span>
                <span className={cn("truncate", hideWhenCollapsed)}>{item.label}</span>
                {pending && (
                  <span
                    className={cn(
                      "ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center font-mono text-[0.7rem] leading-5 font-bold text-primary-foreground tabular-nums",
                      hideWhenCollapsed,
                    )}
                  >
                    {pendingOrders}
                    <span className="sr-only"> pendientes</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      <Link
        href="/"
        target="_blank"
        title={collapsed ? "Ver tienda" : undefined}
        className={cn(
          linkClass,
          collapsedLink,
          "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-[0.55rem] border bg-background">
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </span>
        <span className={cn("truncate", hideWhenCollapsed)}>Ver tienda</span>
        <span className="sr-only">(se abre en otra pestaña)</span>
      </Link>
    </nav>
  );
}
