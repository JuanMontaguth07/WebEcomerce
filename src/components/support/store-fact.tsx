import { getStoreSettings } from "@/features/store-settings/queries";
import { formatNit, formatPhone } from "@/features/store-settings/types";

const FIELDS = {
  name: { label: "[RAZÓN SOCIAL]" },
  nit: { label: "[NIT]" },
  address: { label: "[DIRECCIÓN]" },
  email: { label: "[CORREO DE CONTACTO]" },
  phone: { label: "[TELÉFONO]" },
  payment: { label: "[MEDIOS DE PAGO ACEPTADOS Y PLAZO PARA PAGAR]" },
} as const;

/** Plazo real: create_order reserva 48 horas y expire_pending_orders cancela después. */
export const PAYMENT_WINDOW_HOURS = 48;

/**
 * Dato del vendedor dentro de los textos legales. Si aún no se configuró en el
 * panel, muestra el marcador entre corchetes para que se note que falta.
 */
export async function StoreFact({ field }: { field: keyof typeof FIELDS }) {
  const settings = await getStoreSettings();
  const value = {
    name: settings.legalName,
    nit: formatNit(settings),
    address: [settings.legalAddress, settings.legalCity].filter(Boolean).join(", ") || null,
    email: settings.supportEmail,
    phone: settings.whatsappNumber ? formatPhone(settings.whatsappNumber) : null,
    payment: settings.nequiNumber
      ? `Aceptamos transferencia a Nequi. El pago debe hacerse dentro de las ${PAYMENT_WINDOW_HOURS} horas siguientes al pedido; si no se recibe, el pedido se cancela automáticamente y los productos quedan disponibles de nuevo`
      : null,
  }[field];

  return value ? <>{value}</> : <>{FIELDS[field].label}</>;
}
