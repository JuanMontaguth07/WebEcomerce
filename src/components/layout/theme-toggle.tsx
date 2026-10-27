"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Claro", Icon: SunIcon },
  { value: "dark", label: "Oscuro", Icon: MoonIcon },
  { value: "system", label: "Sistema", Icon: MonitorIcon },
] as const;

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Cambia el tema con la transición circular de globals.css (View Transitions).
 * Sin soporte, con movimiento reducido o si el aspecto no cambia, se aplica al instante.
 */
export function useChangeTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  function changeTheme(value: string) {
    const nextResolved = value === "system" ? (prefersDark() ? "dark" : "light") : value;
    if (
      nextResolved === resolvedTheme ||
      typeof document.startViewTransition !== "function" ||
      prefersReducedMotion()
    ) {
      setTheme(value);
      return;
    }
    // La transición captura el antes y el después: el cambio de clase tiene que ocurrir
    // dentro del callback, por eso se aplica de forma síncrona.
    document.startViewTransition(() => flushSync(() => setTheme(value)));
  }

  return { theme, resolvedTheme, changeTheme };
}

/** Selector de apariencia. El ícono se decide por CSS para evitar desajustes de hidratación. */
export function ThemeToggle() {
  const { theme, changeTheme } = useChangeTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar apariencia">
          <SunIcon className="dark:hidden" aria-hidden />
          <MoonIcon className="hidden dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={changeTheme}>
          {OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
