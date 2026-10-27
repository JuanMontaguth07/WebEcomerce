import { Figtree, IBM_Plex_Sans } from "next/font/google";

// Fuentes del panel (se eligen en «Mi cuenta»). Solo se cargan en /admin.
export const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
