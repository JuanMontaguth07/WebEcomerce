import { formatCOP } from "@/lib/format";

/**
 * Plantillas de los correos de la tienda. Funciones puras: reciben los datos y
 * devuelven asunto, HTML (con estilos en línea, como piden los clientes de
 * correo) y texto plano. Todo lo que viene del cliente se escapa.
 */
export type Email = { subject: string; html: string; text: string };

export type EmailStore = {
  name: string;
  siteUrl: string;
  whatsappNumber: string | null;
  supportEmail: string | null;
  nequiNumber: string | null;
  nequiHolder: string | null;
};

export type EmailOrder = {
  orderNumber: number;
  customerName: string;
  city: string;
  department: string;
  address: string;
  subtotal: number;
  shippingCost: number | null;
  total: number;
  items: { productName: string; quantity: number; subtotal: number }[];
};

const BRAND = "#3d6b00";
const INK = "#101318";
const MUTED = "#5b6470";
const LINE = "#dce1e7";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapeHtml(label)}</a>`;
}

function contactHtml(store: EmailStore) {
  const parts = [
    store.whatsappNumber ? `WhatsApp +${escapeHtml(store.whatsappNumber)}` : null,
    store.supportEmail ? escapeHtml(store.supportEmail) : null,
  ].filter(Boolean);
  return parts.length ? `¿Dudas? Escríbenos: ${parts.join(" · ")}.` : "";
}

function contactText(store: EmailStore) {
  const parts = [
    store.whatsappNumber ? `WhatsApp +${store.whatsappNumber}` : null,
    store.supportEmail,
  ].filter(Boolean);
  return parts.length ? `¿Dudas? Escríbenos: ${parts.join(" · ")}.` : "";
}

/** Marco común: logo en texto, contenido y pie con el contacto. */
function layout(store: EmailStore, preheader: string, body: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(store.name)}</title></head>
<body style="margin:0;background:#f1f4f6;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${BRAND};font-size:20px;font-weight:800;letter-spacing:.5px">${escapeHtml(store.name.toUpperCase())}</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">${contactHtml(store)}<br>${escapeHtml(store.name)} · Precios en pesos colombianos (COP).</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(order: EmailOrder) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${LINE}">${escapeHtml(item.productName)} <span style="color:${MUTED}">× ${item.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid ${LINE};white-space:nowrap">${formatCOP(item.subtotal)}</td></tr>`,
    )
    .join("");
  const shipping = order.shippingCost === null ? "Por confirmar" : formatCOP(order.shippingCost);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}
<tr><td style="padding:8px 0;color:${MUTED}">Envío</td><td align="right" style="padding:8px 0">${shipping}</td></tr>
<tr><td style="padding:8px 0;font-weight:700">Total</td><td align="right" style="padding:8px 0;font-weight:700;font-size:17px">${formatCOP(order.total)}</td></tr></table>`;
}

function itemsText(order: EmailOrder) {
  return [
    ...order.items.map(
      (item) => `- ${item.productName} × ${item.quantity}: ${formatCOP(item.subtotal)}`,
    ),
    `Envío: ${order.shippingCost === null ? "Por confirmar" : formatCOP(order.shippingCost)}`,
    `Total: ${formatCOP(order.total)}`,
  ].join("\n");
}

/** Al cliente, apenas hace el pedido: resumen, cómo pagar y el enlace para seguirlo. */
export function orderReceivedEmail(order: EmailOrder, store: EmailStore, orderUrl: string): Email {
  const nequi = store.nequiNumber
    ? {
        html: `<p style="margin:16px 0 0;padding:14px;border-radius:12px;background:#e9f4d4"><strong>Cómo pagar:</strong> transfiere ${formatCOP(order.total)} por Nequi al <strong>${escapeHtml(store.nequiNumber)}</strong>${store.nequiHolder ? ` (${escapeHtml(store.nequiHolder)})` : ""} y sube el comprobante desde tu pedido. Con eso lo confirmamos más rápido.</p>`,
        text: `Cómo pagar: transfiere ${formatCOP(order.total)} por Nequi al ${store.nequiNumber}${store.nequiHolder ? ` (${store.nequiHolder})` : ""} y sube el comprobante desde tu pedido.`,
      }
    : {
        html: `<p style="margin:16px 0 0">Te contactaremos para confirmar el pago y el envío.</p>`,
        text: "Te contactaremos para confirmar el pago y el envío.",
      };
  const html = layout(
    store,
    `Recibimos tu pedido #${order.orderNumber}`,
    `<h1 style="margin:0 0 8px;font-size:22px">¡Recibimos tu pedido #${order.orderNumber}!</h1>
<p style="margin:0">Hola ${escapeHtml(firstName(order.customerName))}, gracias por comprar en ${escapeHtml(store.name)}. Reservamos tus productos.</p>
${itemsTable(order)}
<p style="margin:0;color:${MUTED};font-size:13px">Entrega: ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.department)}.</p>
${nequi.html}
<p style="margin:22px 0 0">${button(orderUrl, "Ver mi pedido")}</p>
<p style="margin:12px 0 0;font-size:12px;color:${MUTED}">Guarda este correo: con ese enlace consultas el estado de tu pedido.</p>`,
  );
  const text = [
    `¡Recibimos tu pedido #${order.orderNumber}!`,
    `Hola ${firstName(order.customerName)}, gracias por comprar en ${store.name}. Reservamos tus productos.`,
    "",
    itemsText(order),
    "",
    `Entrega: ${order.address}, ${order.city}, ${order.department}.`,
    nequi.text,
    "",
    `Ver mi pedido: ${orderUrl}`,
    contactText(store),
  ].join("\n");
  return { subject: `Recibimos tu pedido #${order.orderNumber}`, html, text };
}

export type NotifiedStatus = "confirmed" | "shipped" | "cancelled";

const STATUS_COPY: Record<
  NotifiedStatus,
  { subject: string; title: string; /** «{n}» es el número del pedido. */ text: string }
> = {
  confirmed: {
    subject: "Confirmamos tu pedido",
    title: "¡Tu pedido está confirmado!",
    text: "tu pedido {n} está confirmado: recibimos el pago y ya estamos preparando tus productos. Te avisamos cuando salga.",
  },
  shipped: {
    subject: "Tu pedido va en camino",
    title: "¡Tu pedido va en camino!",
    text: "tu pedido {n} va en camino: ya lo despachamos y pronto lo recibes en la dirección de entrega.",
  },
  cancelled: {
    subject: "Cancelamos tu pedido",
    title: "Tu pedido fue cancelado",
    text: "cancelamos tu pedido {n}. Si no lo esperabas o quieres volver a pedirlo, escríbenos y te ayudamos.",
  },
};

/** Al cliente cuando el pedido se confirma, se despacha o se cancela. */
export function orderStatusEmail(
  order: EmailOrder,
  status: NotifiedStatus,
  store: EmailStore,
  note?: string | null,
): Email {
  const copy = STATUS_COPY[status];
  const subject = `${copy.subject} #${order.orderNumber}`;
  const noteHtml = note
    ? `<p style="margin:16px 0 0;padding:14px;border-radius:12px;background:#f1f4f6"><strong>Nota:</strong> ${escapeHtml(note)}</p>`
    : "";
  const html = layout(
    store,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">${copy.title}</h1>
<p style="margin:0">Hola ${escapeHtml(firstName(order.customerName))}, ${copy.text.replace("{n}", `<strong>#${order.orderNumber}</strong>`)}</p>
${noteHtml}
${itemsTable(order)}
<p style="margin:0;font-size:12px;color:${MUTED}">Para ver el detalle, abre el enlace del correo con que recibimos tu pedido.</p>`,
  );
  const text = [
    copy.title,
    `Hola ${firstName(order.customerName)}, ${copy.text.replace("{n}", `#${order.orderNumber}`)}`,
    note ? `Nota: ${note}` : "",
    "",
    itemsText(order),
    "",
    "Para ver el detalle, abre el enlace del correo con que recibimos tu pedido.",
    contactText(store),
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n");
  return { subject, html, text };
}

/** Al cliente si el comprobante no sirvió: el motivo y qué hacer. */
export function receiptRejectedEmail(order: EmailOrder, reason: string, store: EmailStore): Email {
  const subject = `Revisa el comprobante de tu pedido #${order.orderNumber}`;
  const html = layout(
    store,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">No pudimos validar tu comprobante</h1>
<p style="margin:0">Hola ${escapeHtml(firstName(order.customerName))}, revisamos el comprobante del pedido <strong>#${order.orderNumber}</strong> y no pudimos confirmar el pago.</p>
<p style="margin:16px 0 0;padding:14px;border-radius:12px;background:#fff4e5"><strong>Motivo:</strong> ${escapeHtml(reason)}</p>
<p style="margin:16px 0 0">Puedes subir otro desde el enlace de tu pedido (el del correo de confirmación) o escribirnos.</p>`,
  );
  const text = [
    "No pudimos validar tu comprobante",
    `Hola ${firstName(order.customerName)}, revisamos el comprobante del pedido #${order.orderNumber} y no pudimos confirmar el pago.`,
    `Motivo: ${reason}`,
    "Puedes subir otro desde el enlace de tu pedido (el del correo de confirmación) o escribirnos.",
    contactText(store),
  ].join("\n");
  return { subject, html, text };
}

/** A los administradores: pedido nuevo o comprobante subido, con el enlace al panel. */
export function adminOrderEmail(
  kind: "order" | "receipt",
  order: EmailOrder,
  store: EmailStore,
  adminUrl: string,
): Email {
  const subject =
    kind === "order"
      ? `Pedido nuevo #${order.orderNumber} · ${formatCOP(order.total)}`
      : `Comprobante de pago · pedido #${order.orderNumber}`;
  const lead =
    kind === "order"
      ? `${escapeHtml(order.customerName)} hizo un pedido desde ${escapeHtml(order.city)}.`
      : `${escapeHtml(order.customerName)} subió el comprobante del pago. Revísalo para confirmar el pedido.`;
  const html = layout(
    store,
    subject,
    `<h1 style="margin:0 0 8px;font-size:20px">${escapeHtml(subject)}</h1>
<p style="margin:0">${lead}</p>
${itemsTable(order)}
<p style="margin:8px 0 0">${button(adminUrl, kind === "order" ? "Ver el pedido" : "Revisar el comprobante")}</p>`,
  );
  const leadText =
    kind === "order"
      ? `${order.customerName} hizo un pedido desde ${order.city}.`
      : `${order.customerName} subió el comprobante del pago. Revísalo para confirmar el pedido.`;
  const text = [subject, leadText, "", itemsText(order), "", adminUrl].join("\n");
  return { subject, html, text };
}
