"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type LinkProps = {
  href: Route;
  children: React.ReactNode;
  tone?: "default" | "sale";
  className?: string;
};

/** Enlace del encabezado; `active` dibuja el subrayado lima. Sin hooks: sirve de respaldo. */
export function HeaderLinkView({
  href,
  children,
  tone = "default",
  className,
  active = false,
}: LinkProps & { active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-secondary",
        "after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-300 aria-[current=page]:after:scale-x-100",
        tone === "sale" ? "text-sale hover:bg-sale/10" : "aria-[current=page]:text-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Igual, con estado activo según la ruta y los parámetros de la URL actual. */
export function HeaderLink(props: LinkProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [path, query] = props.href.split("?");
  const active =
    pathname === path &&
    (!query || [...new URLSearchParams(query)].every(([key, value]) => params.get(key) === value));
  return <HeaderLinkView {...props} active={active} />;
}
