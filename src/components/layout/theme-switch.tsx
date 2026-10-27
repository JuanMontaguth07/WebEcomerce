"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useChangeTheme } from "./theme-toggle";

// El tema real solo se conoce en el navegador: antes de hidratar se pinta neutro.
const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** Interruptor claro / oscuro (role="switch"): activado = modo oscuro. */
export function ThemeSwitch({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { resolvedTheme, changeTheme } = useChangeTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Modo oscuro"
      onClick={() => changeTheme(dark ? "light" : "dark")}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border transition-colors duration-300",
          dark ? "border-primary/50 bg-primary-soft" : "bg-secondary",
        )}
      >
        <SunIcon
          className="absolute left-1.5 size-3.5 text-muted-foreground transition-opacity dark:opacity-40"
          aria-hidden
        />
        <MoonIcon
          className="absolute right-1.5 size-3.5 text-muted-foreground opacity-40 transition-opacity dark:opacity-100"
          aria-hidden
        />
        <span
          className={cn(
            "relative z-10 grid size-5 place-items-center rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ease-out-soft",
            dark ? "translate-x-7" : "translate-x-1",
            !mounted && "opacity-0",
          )}
        >
          {dark ? (
            <MoonIcon className="size-3 text-primary" aria-hidden />
          ) : (
            <SunIcon className="size-3 text-primary" aria-hidden />
          )}
        </span>
      </span>
      {showLabel && <span>{dark ? "Modo oscuro" : "Modo claro"}</span>}
    </button>
  );
}
