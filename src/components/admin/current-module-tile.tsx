"use client";

import { usePathname } from "next/navigation";
import { moduleFor } from "./admin-nav";
import { ModuleTile } from "./module-tile";

/** El ícono de color de la sección actual, junto al título de cada página del panel. */
export function CurrentModuleTile() {
  const item = moduleFor(usePathname());
  if (!item) return null;
  return (
    <ModuleTile
      tone={item.tone}
      Icon={item.Icon}
      className="size-11 rounded-[0.85rem] motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:zoom-in-75 max-sm:hidden"
    />
  );
}
