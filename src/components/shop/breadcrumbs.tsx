import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd } from "@/features/catalog/structured-data";
import { toRoute, type AppHref } from "@/lib/routes";

export type Crumb = { name: string; href?: AppHref };

/** Migas de pan; el último elemento es la página actual. También se publican como JSON-LD. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-muted-foreground">
      <JsonLd data={breadcrumbJsonLd(items)} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.href && !last ? (
                <Link href={toRoute(item.href)} className="hover:text-foreground hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate text-foreground">
                  {item.name}
                </span>
              )}
              {!last && <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
