import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getStoreSettings } from "@/features/store-settings/queries";

/** Barra superior con el anuncio del panel (ofertas, envíos, novedades). */
export async function AnnouncementBar() {
  const { announcementEnabled, announcementText, announcementHref } = await getStoreSettings();
  if (!announcementEnabled || !announcementText) return null;

  const content = (
    <>
      <SparklesIcon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 text-balance">{announcementText}</span>
      {announcementHref && (
        <ArrowRightIcon
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      )}
    </>
  );
  const className =
    "group container-page flex min-h-10 items-center justify-center gap-2 py-2 text-center text-sm font-semibold";

  return (
    <aside aria-label="Anuncio" className="announcement-shine text-primary-foreground">
      {announcementHref ? (
        <Link href={announcementHref as Route} className={`${className} hover:underline`}>
          {content}
        </Link>
      ) : (
        <p className={className}>{content}</p>
      )}
    </aside>
  );
}
