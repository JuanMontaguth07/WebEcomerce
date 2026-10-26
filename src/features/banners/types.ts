/** Anuncio propio de la tienda entre las secciones de la portada (tabla home_banners). */
export type HomeBanner = {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Imagen subida (banners/…) o null para usar la ilustración. */
  imagePath: string | null;
  illustration: BannerIllustration;
  position: number;
  isActive: boolean;
};

export const BANNER_ILLUSTRATIONS = {
  build: "Armado de PC",
  support: "Asesoría",
  shipping: "Envíos",
  warranty: "Garantía",
  deals: "Ofertas",
  upgrade: "Mejora tu equipo",
} as const;

export type BannerIllustration = keyof typeof BANNER_ILLUSTRATIONS;

export const BANNER_ILLUSTRATION_KEYS = Object.keys(BANNER_ILLUSTRATIONS) as BannerIllustration[];
