import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Derecho de retracto",
  description: "Cómo ejercer el derecho de retracto en compras a distancia (Ley 1480 de 2011).",
  alternates: { canonical: "/retracto" },
};

export default function WithdrawalPage() {
  return (
    <LegalPage title="Derecho de retracto" updated="[FECHA]">
      <p>
        En las compras realizadas por medios a distancia puedes retractarte dentro de los cinco (5)
        días hábiles siguientes a la entrega del producto, conforme al artículo 47 de la Ley 1480 de
        2011.
      </p>

      <h2>Condiciones</h2>
      <ul>
        <li>El producto debe devolverse en las mismas condiciones en que se recibió.</li>
        <li>Los costos de transporte de la devolución corren por cuenta del comprador.</li>
        <li>
          No aplica en los casos exceptuados por la ley, por ejemplo bienes confeccionados según
          especificaciones del consumidor o claramente personalizados.
        </li>
      </ul>

      <h2>Cómo ejercerlo</h2>
      <p>
        Escribe a <strong>[CORREO DE CONTACTO]</strong> con tu número de pedido dentro del plazo. Te
        indicaremos cómo devolver el producto.
      </p>

      <h2>Reembolso</h2>
      <p>
        El dinero se devuelve sin descuentos ni retenciones, en un plazo máximo de treinta (30) días
        calendario desde el momento en que ejerces el derecho.
      </p>
    </LegalPage>
  );
}
