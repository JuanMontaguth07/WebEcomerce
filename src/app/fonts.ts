import { Archivo, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

// Display: Archivo con eje de ancho para titulares expandidos.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
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
