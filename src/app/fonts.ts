import { Archivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

// Display: Archivo con eje de ancho para titulares expandidos.
// "optional": los titulares son el LCP y la versión expandida es más ancha que la
// fuente de respaldo; con "swap", al llegar tarde (red móvil lenta) ensanchaba el
// h1 y retrasaba el LCP ~3 s. Si no llega a tiempo se usa el respaldo en esa
// visita y la siguiente ya la toma de la caché.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "optional",
});

// Texto: Hanken Grotesk, muy legible en tamaños pequeños.
export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

// Datos: SKUs, especificaciones y cifras.
export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
