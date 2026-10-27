"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { entryFromParams } from "@/features/architect/entry";
import type { ArchitectPart } from "@/features/architect/types";
import { Configurator } from "./configurator";

type Props = {
  catalogParts: ArchitectPart[];
  demoParts: ArchitectPart[];
  whatsappNumber: string | null;
};

/**
 * Configurador de /arma-tu-pc con las entradas de la tienda (`?pieza`, `?tipo`).
 * Leer la URL va en Suspense: mientras tanto se muestra sin entrada.
 */
export function ConfiguratorEntry(props: Props) {
  return (
    <Suspense fallback={<Configurator {...props} />}>
      <ConfiguratorWithParams {...props} />
    </Suspense>
  );
}

function ConfiguratorWithParams(props: Props) {
  const params = useSearchParams();
  const entry = entryFromParams(params, props.catalogParts);
  return (
    <Configurator
      key={params.toString()}
      {...props}
      initial={entry ? { ...entry, budget: null, parent: null } : undefined}
    />
  );
}
