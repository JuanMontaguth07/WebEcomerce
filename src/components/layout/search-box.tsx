"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchSuggestions } from "@/features/catalog/queries";
import { formatCOP } from "@/lib/format";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type Option = { id: string; href: string; label: string; meta?: string; image?: string | null };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 180;

function toOptions(query: string, data: SearchSuggestions) {
  const products: Option[] = data.products.map((p) => ({
    id: `p-${p.slug}`,
    href: `/productos/${p.slug}`,
    label: p.name,
    meta: formatCOP(Number(p.price)),
    image: p.image_path,
  }));
  const categories: Option[] = data.categories.map((c) => ({
    id: `c-${c.slug}`,
    href: `/categorias/${c.slug}`,
    label: c.name,
    meta: "Categoría",
  }));
  const brands: Option[] = data.brands.map((b) => ({
    id: `b-${b.slug}`,
    href: `/marcas/${b.slug}`,
    label: b.name,
    meta: "Marca",
  }));
  const all: Option = {
    id: "all",
    href: `/buscar?q=${encodeURIComponent(query)}`,
    label: `Ver todos los resultados para «${query}»`,
  };
  return {
    groups: { products, categories, brands },
    flat: [...products, ...categories, ...brands, all],
  };
}

/**
 * Buscador con sugerencias (patrón combobox de WAI-ARIA).
 * Sin JavaScript sigue funcionando como formulario GET hacia /buscar.
 */
export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const { groups, flat } = toOptions(trimmed, data ?? { products: [], categories: [], brands: [] });
  const showList = open && trimmed.length >= MIN_CHARS && data !== null;

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/sugerencias?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          setData((await response.json()) as SearchSuggestions);
          setActive(-1);
        }
      } catch {
        // Petición cancelada o sin conexión: se conservan las sugerencias anteriores.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  // Atajo de teclado "/" para enfocar el buscador.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    inputRef.current?.blur();
    router.push(href as Parameters<typeof router.push>[0]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? flat.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      const option = flat[active];
      if (option) go(option.href);
    }
  }

  function renderGroup(title: string, options: Option[]) {
    if (!options.length) return null;
    return (
      <li role="presentation">
        <p className="px-3 pt-3 pb-1 text-eyebrow text-muted-foreground" aria-hidden>
          {title}
        </p>
        <ul role="group" aria-label={title}>
          {options.map((option) => {
            const index = flat.indexOf(option);
            return (
              <li
                key={option.id}
                id={`${listId}-${option.id}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(option.href)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                  index === active && "bg-secondary",
                )}
              >
                {option.image !== undefined && (
                  <span className="relative size-9 shrink-0 overflow-hidden rounded-md border bg-secondary">
                    {option.image && (
                      <Image
                        src={storageImageUrl(option.image)}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain"
                      />
                    )}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.meta && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {option.meta}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  const allOption = flat[flat.length - 1];
  const hasResults = flat.length > 1;

  return (
    <form
      role="search"
      action="/buscar"
      method="get"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) go(`/buscar?q=${encodeURIComponent(trimmed)}`);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Buscar productos
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        name="q"
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
        placeholder="Busca por producto, marca o SKU"
        maxLength={80}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 && flat[active] ? `${listId}-${flat[active].id}` : undefined
        }
        className="h-10 w-full rounded-xl border border-input bg-secondary pr-10 pl-9 text-base transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--lime)_22%,transparent)] md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : (
          <kbd className="hidden rounded border bg-card px-1.5 font-mono text-[0.625rem] md:inline">
            /
          </kbd>
        )}
      </span>

      <div
        className={cn(
          "absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-raised",
          !showList && "hidden",
        )}
      >
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Sugerencias"
          className="max-h-[70vh] overflow-y-auto p-1"
        >
          {renderGroup("Productos", groups.products)}
          {renderGroup("Categorías", groups.categories)}
          {renderGroup("Marcas", groups.brands)}
          {!hasResults && (
            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
              No encontramos coincidencias. Prueba con otra palabra o el SKU.
            </li>
          )}
          {allOption && (
            <li
              id={`${listId}-${allOption.id}`}
              role="option"
              aria-selected={active === flat.length - 1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(allOption.href)}
              onMouseEnter={() => setActive(flat.length - 1)}
              className={cn(
                "mt-1 flex cursor-pointer items-center gap-2 rounded-md border-t px-3 py-2.5 text-sm font-semibold text-primary",
                active === flat.length - 1 && "bg-secondary",
              )}
            >
              <SearchIcon className="size-4" aria-hidden />
              {allOption.label}
            </li>
          )}
        </ul>
      </div>
      <p className="sr-only" aria-live="polite">
        {showList ? `${flat.length - 1} sugerencias disponibles` : ""}
      </p>
    </form>
  );
}
