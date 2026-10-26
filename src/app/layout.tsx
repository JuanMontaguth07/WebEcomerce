import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/providers";
import { siteConfig } from "@/config/site";
import { allowIndexing, baseOpenGraph } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { archivo, hanken, jetbrains } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.shortDescription,
  applicationName: siteConfig.name,
  robots: allowIndexing ? undefined : { index: false, follow: false },
  openGraph: {
    ...baseOpenGraph,
    title: siteConfig.name,
    description: siteConfig.shortDescription,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0909" },
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
