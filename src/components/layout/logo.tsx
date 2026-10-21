import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Logotipo provisional (marca tipográfica) hasta tener el logo definitivo. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md font-heading text-base font-extrabold tracking-tight font-stretch-125% outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-7 text-primary" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-foreground" />
        <rect
          x="9"
          y="9"
          width="14"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M13 5v4M19 5v4M13 23v4M19 23v4M5 13h4M5 19h4M23 13h4M23 19h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="max-w-[12rem] truncate">{siteConfig.name}</span>
    </Link>
  );
}
