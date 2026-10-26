import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { StoreFact } from "@/components/support/store-fact";

export const metadata: Metadata = {
  title: "Política de garantías",
  description: "Cómo solicitar la garantía de un producto comprado en la tienda.",
  alternates: { canonical: "/garantias" },
};

export default function WarrantyPage() {
  return (
    <LegalPage title="Política de garantías" updated="[FECHA]">
      <p>
        Todos los productos cuentan con la garantía legal establecida en la Ley 1480 de 2011. El
        término de garantía de cada producto se indica en su ficha. Cuando no se indique, aplica el
        término legal.
      </p>

      <h2>Qué cubre</h2>
      <p>
        La garantía cubre defectos de calidad, idoneidad y funcionamiento del producto. No cubre
        daños por mal uso, golpes, humedad, descargas eléctricas, instalación inadecuada,
        modificaciones o manipulación por terceros no autorizados.
      </p>

      <h2>Cómo solicitarla</h2>
      <ul>
        <li>
          Escribe a{" "}
          <strong>
            <StoreFact field="email" />
          </strong>{" "}
          con tu número de pedido, el producto y una descripción de la falla.
        </li>
        <li>Conserva el empaque, los accesorios y la factura cuando sea posible.</li>
        <li>
          <strong>[PROCEDIMIENTO: DÓNDE ENTREGAR O CÓMO ENVIAR EL PRODUCTO]</strong>.
        </li>
      </ul>

      <h2>Respuesta</h2>
      <p>
        Responderemos en los plazos previstos por la ley. Si procede, el producto se repara; si la
        falla se repite o no es posible repararlo, se cambia por otro igual o se devuelve el dinero,
        según lo establecido en el Estatuto del Consumidor.
      </p>
    </LegalPage>
  );
}
