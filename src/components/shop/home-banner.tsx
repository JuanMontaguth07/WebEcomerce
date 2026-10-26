import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HomeBanner } from "@/features/banners/types";
import { storageImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";
import { BannerIllustration } from "./banner-illustration";

type BannerContent = Pick<
  HomeBanner,
  "eyebrow" | "title" | "body" | "ctaLabel" | "ctaHref" | "imagePath" | "illustration"
>;

/**
 * Anuncio propio de la tienda entre las secciones de la portada. La imagen se
 * difumina hacia el texto y el lado se alterna (`reverse`) de un anuncio al
 * siguiente. Aparece con un leve desenfoque al entrar en pantalla.
 */
export function HomeBannerCard({
  banner,
  reverse = false,
  imageSrc,
  headingLevel = "h2",
  className,
}: {
  banner: BannerContent;
  reverse?: boolean;
  /** Vista previa del panel: imagen aún sin subir (blob:). */
  imageSrc?: string | null;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  const src = imageSrc ?? (banner.imagePath ? storageImageUrl(banner.imagePath) : null);

  return (
    <div
      data-side={reverse ? "left" : "right"}
      className={cn(
        "banner-reveal relative isolate grid overflow-hidden rounded-3xl border bg-card md:min-h-80 md:grid-cols-2",
        className,
      )}
    >
      {/* Halo de la marca detrás de la imagen */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -z-10 size-96 rounded-full bg-primary/15 blur-3xl",
          reverse ? "-top-24 -left-24" : "-right-24 -bottom-24",
        )}
      />

      <div
        className={cn(
          "banner-media relative min-h-52 md:min-h-full",
          reverse ? "md:order-first" : "md:order-last",
        )}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            unoptimized={src.startsWith("blob:")}
            className={cn(
              "object-cover",
              // Difuminado hacia el texto: abajo en móvil, al costado en escritorio.
              "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]",
              reverse
                ? "md:[mask-image:linear-gradient(to_right,black_45%,transparent)]"
                : "md:[mask-image:linear-gradient(to_left,black_45%,transparent)]",
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6">
            {/* Trama de puntos que se desvanece: textura técnica detrás del dibujo. */}
            <span
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle,var(--border)_1.5px,transparent_1.5px)] [mask-image:radial-gradient(closest-side,black,transparent)] bg-size-[18px_18px]"
            />
            <BannerIllustration
              kind={banner.illustration}
              className="relative h-full max-h-64 w-full max-w-md drop-shadow-sm"
            />
          </div>
        )}
      </div>

      <div className="relative grid content-center gap-3 p-6 sm:p-10">
        {banner.eyebrow && <p className="text-eyebrow text-primary">{banner.eyebrow}</p>}
        <Heading className="text-3xl leading-tight font-extrabold text-balance font-stretch-112% md:text-4xl">
          {banner.title}
        </Heading>
        {banner.body && (
          <p className="max-w-prose text-pretty text-muted-foreground md:text-lg">{banner.body}</p>
        )}
        {banner.ctaLabel && banner.ctaHref && (
          <Button asChild size="lg" className="group mt-2 w-fit">
            <Link href={banner.ctaHref as Route}>
              {banner.ctaLabel}
              <ArrowRightIcon
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
