"use client";

import Link from "next/link";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusMessage
      code={error.digest ? `Referencia ${error.digest}` : "Error"}
      title="No pudimos cargar el panel"
      description="Ocurrió un error al consultar los datos. Reintenta; si persiste, comparte la referencia con soporte técnico."
    >
      <Button onClick={reset}>Reintentar</Button>
      <Button asChild variant="secondary">
        <Link href="/ingresar">Volver a ingresar</Link>
      </Button>
    </StatusMessage>
  );
}
