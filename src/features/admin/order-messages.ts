import type { OrderStatus } from "@/features/orders/transitions";
import type { StoreSettings } from "@/features/store-settings/types";
import { formatPhone } from "@/features/store-settings/types";
import { formatCOP } from "@/lib/format";

/**
 * Mensajes listos para enviar al cliente por WhatsApp desde el pedido. Solo se
 * ofrecen los que tienen sentido en el estado actual.
 */

type OrderForMessages = {
  orderNumber: number;
  status: OrderStatus;
  customerName: string;
  city: string;
  subtotal: number;
  shippingCost: number | null;
  total: number;
};

export type CustomerMessage = { key: string; label: string; text: string };

export function customerMessages(
  order: OrderForMessages,
  settings: Pick<StoreSettings, "nequiNumber" | "nequiHolder">,
): CustomerMessage[] {
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? "";
  const hello = `Hola ${firstName}`;
  const number = `#${order.orderNumber}`;
  const messages: CustomerMessage[] = [];

  if (order.status === "pending") {
    if (order.shippingCost === null) {
      messages.push({
        key: "shipping-pending",
        label: "Avisar que falta el envío",
        text: `${hello}, recibimos tu pedido ${number}. En un momento te confirmamos el valor del envío a ${order.city} para que puedas pagar.`,
      });
    } else if (settings.nequiNumber) {
      const holder = settings.nequiHolder ? ` a nombre de ${settings.nequiHolder}` : "";
      messages.push({
        key: "payment",
        label: "Enviar datos de pago",
        text: `${hello}, recibimos tu pedido ${number} por ${formatCOP(order.total)}. Puedes pagarlo por Nequi al ${formatPhone(`57${settings.nequiNumber}`)}${holder}. Cuando transfieras, envíanos el comprobante por aquí.`,
      });
    }
  }

  if (order.shippingCost !== null && ["pending", "confirmed", "preparing"].includes(order.status)) {
    messages.push({
      key: "shipping-value",
      label: "Informar valor del envío",
      text: `${hello}, el envío de tu pedido ${number} a ${order.city} cuesta ${formatCOP(order.shippingCost)}. El total queda en ${formatCOP(order.total)}.`,
    });
  }

  if (order.status === "confirmed" || order.status === "preparing") {
    messages.push({
      key: "paid",
      label: "Confirmar pago recibido",
      text: `${hello}, confirmamos el pago de tu pedido ${number}. Ya lo estamos preparando y te avisamos cuando salga.`,
    });
  }

  if (order.status === "shipped") {
    messages.push({
      key: "shipped",
      label: "Avisar que va en camino",
      text: `${hello}, tu pedido ${number} ya va en camino a ${order.city}. Cualquier duda, escríbenos por aquí.`,
    });
  }

  if (order.status === "delivered") {
    messages.push({
      key: "thanks",
      label: "Agradecer la compra",
      text: `${hello}, ¡gracias por tu compra! Esperamos que disfrutes tu pedido ${number}. Si necesitas algo, aquí estamos.`,
    });
  }

  return messages;
}

/** Número para WhatsApp: celulares colombianos de 10 dígitos llevan el indicativo 57. */
export function customerWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
}
