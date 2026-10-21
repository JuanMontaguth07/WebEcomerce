import { StatusMessage } from "@/components/layout/status-message";

export default function ShopNotFound() {
  return (
    <StatusMessage
      code="404"
      title="No encontramos esta página"
      description="Puede que el producto ya no esté disponible o que el enlace tenga un error. Busca en el catálogo o vuelve al inicio."
    />
  );
}
