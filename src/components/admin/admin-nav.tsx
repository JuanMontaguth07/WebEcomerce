"use client";

import {
  BoxesIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  TagIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Resumen", Icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ClipboardListIcon },
  { href: "/admin/productos", label: "Productos", Icon: BoxesIcon },
  { href: "/admin/inventario", label: "Inventario", Icon: WarehouseIcon },
  { href: "/admin/categorias", label: "Categorías", Icon: FolderTreeIcon },
  { href: "/admin/marcas", label: "Marcas", Icon: TagIcon },
  { href: "/admin/envios", label: "Envíos", Icon: TruckIcon },
  { href: "/admin/configuracion", label: "Configuración", Icon: SettingsIcon },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Panel"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible"
    >
      {NAV.map(({ href, label, Icon, ...rest }) => {
        const exact = "exact" in rest && rest.exact;
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        target="_blank"
        className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:bg-secondary hover:text-foreground lg:mt-2"
      >
        <ExternalLinkIcon className="size-4" aria-hidden />
        Ver tienda
        <span className="sr-only">(se abre en otra pestaña)</span>
      </Link>
    </nav>
  );
}
