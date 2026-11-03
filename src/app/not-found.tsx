import type { Metadata } from "next";
import { StatusMessage } from "@/components/layout/status-message";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <StatusMessage
      code="404"
      mood="worried"
      title="No encontramos esta página"
      description="Revisa la dirección o vuelve al catálogo."
    />
  );
}
