"use client";

import {
  ArrowRightIcon,
  BoxesIcon,
  ClipboardListIcon,
  CornerDownLeftIcon,
  ExternalLinkIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { adminQuickSearch, type QuickResult } from "@/features/admin/search-actions";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./admin-nav";

type Item = {
  key: string;
  group: string;
  title: string;
  detail?: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PAGES: Item[] = [
  ...ADMIN_NAV.flatMap((group) =>
    group.items.map((item) => ({
      key: item.href,
      group: "Ir a",
      title: item.label,
      detail: item.keywords,
      href: item.href,
      Icon: item.Icon,
    })),
  ),
  {
    key: "nuevo-producto",
    group: "Acciones",
    title: "Nuevo producto",
    href: "/admin/productos/nuevo",
    Icon: PlusIcon,
  },
  {
    key: "pendientes",
    group: "Acciones",
    title: "Pedidos pendientes de pago",
    href: "/admin/pedidos?estado=pending",
    Icon: ClipboardListIcon,
  },
  {
    key: "tienda",
    group: "Acciones",
    title: "Abrir la tienda",
    href: "/",
    Icon: ExternalLinkIcon,
    external: true,
  },
];

/**
 * Paleta de comandos del panel (Ctrl+K o ⌘K): ir a cualquier sección o abrir
 * un producto o pedido escribiendo su nombre, SKU o número.
 */
export function CommandPalette() {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ products: QuickResult[]; orders: QuickResult[] }>({
    products: [],
    orders: [],
  });
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Búsqueda en la base con una pausa corta para no consultar en cada tecla.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await adminQuickSearch({ q: text });
      if (!cancelled && result.ok) setResults(result.data);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const items = useMemo(() => {
    const text = normalize(query.trim());
    const pages = text
      ? PAGES.filter((item) => normalize(`${item.title} ${item.detail ?? ""}`).includes(text))
      : PAGES;
    const remote =
      text.length >= 2
        ? [
            ...results.orders.map((result) => ({
              key: result.href,
              group: "Pedidos",
              title: result.title,
              detail: result.detail,
              href: result.href,
              Icon: ClipboardListIcon,
            })),
            ...results.products.map((result) => ({
              key: result.href,
              group: "Productos",
              title: result.title,
              detail: result.detail,
              href: result.href,
              Icon: BoxesIcon,
            })),
          ]
        : [];
    return [...remote, ...pages];
  }, [query, results]);

  const activeIndex = Math.min(active, Math.max(0, items.length - 1));

  function go(item: Item) {
    setOpen(false);
    setQuery("");
    if (item.external) window.open(item.href, "_blank", "noopener");
    else router.push(item.href as Route);
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? (activeIndex + 1) % Math.max(1, items.length)
          : (activeIndex - 1 + items.length) % Math.max(1, items.length);
      setActive(next);
      listRef.current
        ?.querySelector(`[data-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
    if (event.key === "Enter") {
      const item = items[activeIndex];
      if (item) {
        event.preventDefault();
        go(item);
      }
    }
  }

  let lastGroup = "";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mr-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Buscar en el panel…</span>
          <kbd className="ml-auto hidden rounded border bg-secondary px-1.5 font-mono text-[0.7rem] sm:inline">
            Ctrl K
          </kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 grid w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
        >
          <Dialog.Title className="sr-only">Buscar en el panel</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              aria-label="Página, producto, SKU o número de pedido"
              placeholder="Página, producto, SKU o #pedido"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {items.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                Sin resultados para «{query}».
              </li>
            )}
            {items.map((item, index) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <li key={`${item.group}-${item.key}`} role="presentation">
                  {header && (
                    <p
                      role="presentation"
                      className="px-3 pt-3 pb-1 text-eyebrow font-mono text-muted-foreground"
                    >
                      {header}
                    </p>
                  )}
                  <div
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      index === activeIndex && "bg-primary-soft text-primary",
                    )}
                  >
                    <item.Icon className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.detail && item.group !== "Ir a" && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      )}
                    </span>
                    {index === activeIndex ? (
                      <CornerDownLeftIcon className="size-4 shrink-0" aria-hidden />
                    ) : (
                      <ArrowRightIcon className="size-4 shrink-0 opacity-0" aria-hidden />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="flex gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>↑ ↓ para moverte</span>
            <span>Enter para abrir</span>
            <span>Esc para cerrar</span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
