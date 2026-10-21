import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de compra en la tienda: pedidos, precios, pagos, envíos y garantías.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updated="[FECHA]">
      <p>
        Estos términos regulan las compras realizadas en esta tienda, operada por{" "}
        <strong>[RAZÓN SOCIAL]</strong> (NIT <strong>[NIT]</strong>). Al confirmar un pedido aceptas
        estas condiciones, de acuerdo con la Ley 1480 de 2011 (Estatuto del Consumidor).
      </p>

      <h2>Pedidos</h2>
      <p>
        Al confirmar un pedido recibes un número y un enlace para consultarlo. El pedido queda en
        estado <strong>pendiente</strong> y reservamos las unidades durante 48 horas mientras nos
        comunicamos contigo para confirmar pago y envío. Si no se confirma en ese plazo, el pedido
        se cancela y las unidades se liberan.
      </p>

      <h2>Precios y disponibilidad</h2>
      <p>
        Los precios se expresan en pesos colombianos (COP). El precio que se cobra es el vigente al
        momento de confirmar el pedido. La disponibilidad se actualiza en tiempo real; si un
        producto se agota antes de confirmar, te avisamos para que ajustes tu compra.{" "}
        <strong>[INDICAR SI LOS PRECIOS INCLUYEN IVA]</strong>.
      </p>

      <h2>Pagos</h2>
      <p>
        <strong>[MEDIOS DE PAGO ACEPTADOS Y PLAZO PARA PAGAR]</strong>. Por ahora la tienda no
        realiza cobros en línea al confirmar el pedido.
      </p>

      <h2>Envíos</h2>
      <p>
        <strong>[COBERTURA, TRANSPORTADORAS, COSTOS Y TIEMPOS DE ENTREGA]</strong>. El costo de
        envío se informa antes del despacho.
      </p>

      <h2>Garantías y retracto</h2>
      <p>
        Consulta la{" "}
        <Link href="/garantias" className="font-semibold text-primary underline">
          política de garantías
        </Link>{" "}
        y el{" "}
        <Link href="/retracto" className="font-semibold text-primary underline">
          derecho de retracto
        </Link>
        .
      </p>

      <h2>Contacto</h2>
      <p>
        <strong>[CORREO DE CONTACTO]</strong> · <strong>[TELÉFONO]</strong> ·{" "}
        <strong>[DIRECCIÓN]</strong>.
      </p>
    </LegalPage>
  );
}
