"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El detalle queda en los registros del servidor; aquí solo el identificador.
    if (error.digest) console.info(`Referencia del error: ${error.digest}`);
  }, [error.digest]);

  return (
    <StatusMessage
      code="Error"
      title="No pudimos cargar esta página"
      description="Ocurrió un problema temporal. Inténtalo de nuevo en unos segundos."
    >
      <Button onClick={reset}>Reintentar</Button>
      <Button asChild variant="secondary">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </StatusMessage>
  );
}
