import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales",
  description: "Cómo tratamos tus datos personales conforme a la Ley 1581 de 2012.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de tratamiento de datos personales" updated="[FECHA]">
      <p>
        <strong>[RAZÓN SOCIAL]</strong>, identificada con NIT <strong>[NIT]</strong>, con domicilio
        en <strong>[DIRECCIÓN, CIUDAD]</strong>, es responsable del tratamiento de los datos
        personales que recolecta a través de esta tienda, en cumplimiento de la Ley 1581 de 2012 y
        el Decreto 1377 de 2013.
      </p>

      <h2>Datos que recolectamos</h2>
      <ul>
        <li>Nombre completo, correo electrónico y teléfono.</li>
        <li>Cédula o NIT, cuando la persona decide suministrarlo para facturación.</li>
        <li>Dirección, ciudad y departamento de entrega, e indicaciones adicionales.</li>
        <li>Productos, cantidades y valores de cada pedido.</li>
      </ul>

      <h2>Finalidades</h2>
      <ul>
        <li>Gestionar, confirmar, despachar y hacer seguimiento a los pedidos.</li>
        <li>Contactar al titular para coordinar pago, envío, garantías y devoluciones.</li>
        <li>Expedir facturas y cumplir obligaciones legales, contables y tributarias.</li>
        <li>Atender peticiones, quejas, reclamos y solicitudes de garantía.</li>
      </ul>

      <h2>Derechos del titular</h2>
      <p>
        Como titular puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la
        autorización; ser informado sobre su uso; revocar la autorización o pedir la supresión
        cuando no exista un deber legal de conservarlos; y presentar quejas ante la Superintendencia
        de Industria y Comercio.
      </p>

      <h2>Cómo ejercer tus derechos</h2>
      <p>
        Escribe a <strong>[CORREO DE CONTACTO]</strong> indicando tu nombre, el derecho que deseas
        ejercer y un medio de respuesta. Las consultas se responden en un máximo de diez (10) días
        hábiles y los reclamos en un máximo de quince (15) días hábiles, en los términos de la Ley
        1581 de 2012.
      </p>

      <h2>Seguridad y conservación</h2>
      <p>
        Los datos se almacenan con controles de acceso restringido y solo los consulta el personal
        autorizado. Se conservan durante el tiempo necesario para cumplir las finalidades descritas
        y las obligaciones legales aplicables.
      </p>
    </LegalPage>
  );
}
