"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Fila horizontal que se desliza con el dedo, la rueda o las flechas, y se
 * detiene en cada tarjeta. Las flechas se apagan en los extremos.
 */
export function ProductRail({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const update = () =>
      setEdges({
        start: list.scrollLeft <= 4,
        end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4,
      });
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: 1 | -1) => {
    const list = ref.current;
    if (!list) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({
      left: direction * list.clientWidth * 0.85,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 md:-mx-6 md:scroll-px-6 md:px-6 xl:-mx-8 xl:scroll-px-8 xl:px-8"
      >
        {children}
      </ul>
      {!(edges.start && edges.end) && (
        <div className="pointer-events-none absolute -inset-x-2 inset-y-0 hidden items-center justify-between md:flex">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Anteriores"
            disabled={edges.start}
            onClick={() => scroll(-1)}
            className="pointer-events-auto rounded-full shadow-raised disabled:opacity-0"
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Siguientes"
            disabled={edges.end}
            onClick={() => scroll(1)}
            className="pointer-events-auto rounded-full shadow-raised disabled:opacity-0"
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
