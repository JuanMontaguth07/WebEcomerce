import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";

// Titulares: Mona Sans (GitHub, licencia OFL en src/assets/fonts) con eje de ancho para
// los titulares expandidos. No está en Google Fonts: se aloja solo el subconjunto latino.
// "optional": los titulares son el LCP y la versión expandida es más ancha que la fuente
// de respaldo; con "swap", al llegar tarde (red móvil lenta) ensanchaba el h1 y retrasaba
// el LCP. Si no llega a tiempo se usa el respaldo en esa visita y la siguiente ya la toma
// de la caché.
export const display = localFont({
  src: [{ path: "../assets/fonts/mona-sans-latin-wdth.woff2", weight: "200 900", style: "normal" }],
  variable: "--font-display",
  display: "optional",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
  fallback: ["Arial", "system-ui", "sans-serif"],
});

// Texto: Instrument Sans, limpia y muy legible en tamaños pequeños.
export const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Datos: SKUs, especificaciones y cifras.
export const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-data",
  display: "swap",
});
