import { MessageCircleIcon } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getStoreSettings } from "@/features/store-settings/queries";
import { whatsappLink } from "@/features/store-settings/types";

/**
 * Botón flotante de WhatsApp. Solo aparece si hay un número configurado en el
 * panel. Queda por debajo de menús y paneles (z-30) para no taparlos.
 */
export async function WhatsAppFloat() {
  const { whatsappNumber } = await getStoreSettings();
  if (!whatsappNumber) return null;

  return (
    <aside aria-label="Contacto rápido">
      <a
        href={whatsappLink(whatsappNumber, `Hola ${siteConfig.name}, tengo una pregunta.`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp (se abre en otra pestaña)"
        className="whatsapp-float group fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center gap-2 rounded-full bg-[#25D366] px-4 font-semibold text-[#0B141A] shadow-raised transition-transform duration-200 ease-out-soft outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-[#25D366]/50 active:scale-95 sm:h-12"
      >
        <MessageCircleIcon className="size-6 sm:size-5" aria-hidden />
        <span className="hidden sm:inline">¿Dudas? Escríbenos</span>
      </a>
    </aside>
  );
}
