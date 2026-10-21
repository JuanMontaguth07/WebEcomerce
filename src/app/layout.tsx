import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/providers";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { archivo, hanken, jetbrains } from "./fonts";
import "./globals.css";

// Solo producción en Vercel se indexa; previews y local quedan fuera de buscadores.
const allowIndexing = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.shortDescription,
  robots: allowIndexing ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0C10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes agrega la clase del tema antes de hidratar.
    <html
      lang="es-CO"
      suppressHydrationWarning
      className={cn("h-full antialiased", archivo.variable, hanken.variable, jetbrains.variable)}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
