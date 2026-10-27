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
import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: Route;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
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
        keywords: "ordenes compras pagos nequi",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", Icon: BoxesIcon, keywords: "articulos" },
      {
        href: "/admin/rarezas",
        label: "Rarezas",
        Icon: GemIcon,
        keywords: "calidad niveles efectos colores comun legendario",
      },
      {
        href: "/admin/etiquetas",
        label: "Etiquetas",
        Icon: FlagIcon,
        keywords: "banderas marcas logos nvidia amd intel",
      },
      {
        href: "/admin/inventario",
        label: "Inventario",
        Icon: WarehouseIcon,
        keywords: "stock movimientos",
      },
      { href: "/admin/categorias", label: "Categorías", Icon: FolderTreeIcon },
      { href: "/admin/marcas", label: "Marcas", Icon: TagIcon },
    ],
  },
  {
    title: "Tienda",
    items: [
      {
        href: "/admin/portada",
        label: "Portada",
        Icon: MegaphoneIcon,
        keywords: "anuncios banners inicio publicidad armamos asesoria",
      },
      { href: "/admin/envios", label: "Envíos", Icon: TruckIcon, keywords: "tarifas ciudades" },
      {
        href: "/admin/configuracion",
        label: "Configuración",
        Icon: SettingsIcon,
        keywords: "anuncio whatsapp nequi datos legales nit",
      },
      {
        href: "/admin/actividad",
        label: "Actividad",
        Icon: HistoryIcon,
        keywords: "historial cambios registro",
      },
      {
        href: "/admin/cuenta",
        label: "Mi cuenta",
        Icon: UserCogIcon,
        keywords: "perfil contraseña tema oscuro claro color fuente cerrar sesion",
      },
    ],
  },
];

const linkClass =
  "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors";

export function AdminNav({ pendingOrders }: { pendingOrders: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Panel"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:gap-4 lg:overflow-visible"
    >
      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "inicio"} className="contents lg:grid lg:gap-1">
          {group.title && (
            <p className="hidden px-3 text-eyebrow font-mono text-muted-foreground lg:block">
              {group.title}
            </p>
          )}
          {group.items.map(({ href, label, Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  linkClass,
                  active
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {href === "/admin/pedidos" && pendingOrders > 0 && (
                  <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center font-mono text-[0.7rem] leading-5 font-bold text-primary-foreground tabular-nums">
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
        className={cn(linkClass, "text-muted-foreground hover:bg-secondary hover:text-foreground")}
      >
        <ExternalLinkIcon className="size-4" aria-hidden />
        Ver tienda
        <span className="sr-only">(se abre en otra pestaña)</span>
      </Link>
    </nav>
  );
}
