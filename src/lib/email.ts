import "server-only";
import { logError } from "@/lib/errors";

/**
 * Envío de correos con Resend (https://resend.com), por su API, sin librerías.
 * Se activa con dos variables de entorno del servidor (Vercel → Settings →
 * Environment Variables), nunca con NEXT_PUBLIC_:
 *   RESEND_API_KEY  la clave de la cuenta (re_…)
 *   EMAIL_FROM      remitente de un dominio verificado, p. ej. «Kova Studio <pedidos@kovastudio.co>»
 * Sin ellas no se envía nada (la tienda funciona igual). Un error al enviar
 * se registra pero nunca hace fallar lo que lo disparó.
 */
export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Correos de los administradores para los avisos (ADMIN_NOTIFY_EMAILS, separados por coma). */
export function adminNotifyEmails(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
}

export async function sendEmail(email: OutgoingEmail): Promise<"sent" | "skipped" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return "skipped";
  const to = (Array.isArray(email.to) ? email.to : [email.to]).filter(Boolean);
  if (!to.length) return "skipped";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
    }
    return "sent";
  } catch (error) {
    logError("sendEmail", error);
    return "failed";
  }
}
