"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { createContext, use, useState } from "react";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "./sidebar-cookie";

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
});

export function useSidebar() {
  return use(SidebarContext);
}

/**
 * Marco del panel: en pantallas grandes el menú lateral se puede contraer a solo
 * íconos. La preferencia queda en una cookie para que el servidor lo pinte igual
 * (sin salto al cargar). Los hijos se adaptan con `group-data-[collapsed=true]/shell`.
 */
export function AdminFrame({
  initialCollapsed,
  className,
  children,
  ...rest
}: {
  initialCollapsed: boolean;
  className?: string;
  children: React.ReactNode;
} & Record<`data-${string}`, string>) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
  };

  return (
    <SidebarContext value={{ collapsed, toggle }}>
      <div
        {...rest}
        data-collapsed={collapsed}
        className={cn(
          "group/shell grid-cols-[minmax(0,1fr)] [--sidebar-w:15rem] data-[collapsed=true]:[--sidebar-w:4.75rem] motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-out-soft lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]",
          className,
        )}
      >
        {children}
      </div>
    </SidebarContext>
  );
}

/** Contrae o expande el menú lateral (solo en pantallas grandes). */
export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();
  const Icon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-controls="admin-sidebar"
      aria-label={collapsed ? "Expandir el menú" : "Contraer el menú"}
      title={collapsed ? "Expandir el menú" : "Contraer el menú"}
      className="hidden w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:flex lg:group-data-[collapsed=true]/shell:justify-center lg:group-data-[collapsed=true]/shell:px-0"
    >
      <span className="grid size-7 shrink-0 place-items-center">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="truncate lg:group-data-[collapsed=true]/shell:sr-only">Contraer menú</span>
    </button>
  );
}
