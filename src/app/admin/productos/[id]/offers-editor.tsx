"use client";

import {
  CalendarCheckIcon,
  ExternalLinkIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveProductOffers } from "@/features/offers/actions";
import {
  OFFER_STORE_KEYS,
  OFFER_STORES,
  searchLinks,
  type OfferCurrency,
  type OfferStore,
  type ProductOffer,
} from "@/features/offers/stores";

type Row = {
  key: string;
  store: OfferStore;
  storeName: string;
  url: string;
  price: string;
  currency: OfferCurrency;
  note: string;
  checkedAt: string;
};

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const toRow = (offer: ProductOffer): Row => ({
  key: offer.id,
  store: offer.store,
  storeName: offer.storeName ?? "",
  url: offer.url,
  price: offer.price === null ? "" : String(offer.price),
  currency: offer.currency,
  note: offer.note ?? "",
  checkedAt: offer.checkedAt,
});

const field =
  "h-9 w-full min-w-0 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-primary";

/**
 * Dónde más se consigue la pieza (Amazon, MercadoLibre…): enlace, precio y la
 * fecha en que lo revisaste. Arma tu PC las muestra junto a «Disponible aquí».
 */
export function OffersEditor({
  productId,
  productName,
  offers,
}: {
  productId: string;
  productName: string;
  offers: ProductOffer[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => offers.map(toRow));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const id = useId();

  const change = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function add() {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        store: current.some((row) => row.store === "amazon") ? "mercadolibre" : "amazon",
        storeName: "",
        url: "",
        price: "",
        currency: "COP",
        note: "",
        checkedAt: today(),
      },
    ]);
  }

  function save() {
    startTransition(async () => {
      const result = await saveProductOffers({
        productId,
        offers: rows.map((row) => ({
          store: row.store,
          storeName: row.storeName,
          url: row.url,
          price: row.price.replace(/\D/g, ""),
          currency: row.currency,
          note: row.note,
          checkedAt: row.checkedAt,
        })),
      });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setErrors({});
      toast.success(result.data.saved ? "Ofertas guardadas" : "Ofertas borradas");
      router.refresh();
    });
  }

  // Los errores llegan como «offers.1.url»: se muestran en su fila.
  const errorFor = (index: number) =>
    Object.entries(errors)
      .filter(([path]) => path.startsWith(`offers.${index}.`))
      .flatMap(([, messages]) => messages);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Buscar esta pieza:</span>
        {searchLinks(productName).map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
          >
            <SearchIcon className="size-3" aria-hidden />
            {link.label}
          </a>
        ))}
      </div>

      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((row, index) => {
            const rowErrors = errorFor(index);
            return (
              <li key={row.key} className="grid gap-2 rounded-xl border bg-background/50 p-3">
                <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <label className="grid gap-1 text-xs font-medium">
                    Tienda
                    <select
                      className={field}
                      value={row.store}
                      onChange={(event) =>
                        change(row.key, { store: event.target.value as OfferStore })
                      }
                    >
                      {OFFER_STORE_KEYS.map((store) => (
                        <option key={store} value={store}>
                          {OFFER_STORES[store].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Enlace al producto
                    <span className="flex gap-1.5">
                      <input
                        className={field}
                        inputMode="url"
                        placeholder="https://…"
                        value={row.url}
                        onChange={(event) => change(row.key, { url: event.target.value })}
                      />
                      {/^https:\/\//.test(row.url) && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir el enlace"
                          className="grid size-9 shrink-0 place-items-center rounded-lg border text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLinkIcon className="size-4" aria-hidden />
                        </a>
                      )}
                    </span>
                  </label>
                </div>
                {row.store === "other" && (
                  <label className="grid gap-1 text-xs font-medium">
                    Nombre de la tienda
                    <input
                      className={field}
                      value={row.storeName}
                      maxLength={60}
                      onChange={(event) => change(row.key, { storeName: event.target.value })}
                    />
                  </label>
                )}
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto] sm:items-end">
                  <label className="grid gap-1 text-xs font-medium">
                    Precio
                    <input
                      className={field}
                      inputMode="numeric"
                      placeholder="Opcional"
                      value={row.price}
                      onChange={(event) => change(row.key, { price: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Moneda
                    <select
                      className={field}
                      value={row.currency}
                      onChange={(event) =>
                        change(row.key, { currency: event.target.value as OfferCurrency })
                      }
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Revisado el
                    <input
                      type="date"
                      className={field}
                      value={row.checkedAt}
                      onChange={(event) => change(row.key, { checkedAt: event.target.value })}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar esta oferta"
                    onClick={() =>
                      setRows((current) => current.filter((item) => item.key !== row.key))
                    }
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </div>
                <label className="grid gap-1 text-xs font-medium">
                  <span>
                    Nota <span className="font-normal text-muted-foreground">(opcional)</span>
                  </span>
                  <input
                    className={field}
                    maxLength={120}
                    placeholder="+ envío internacional · usado · vendido por terceros…"
                    value={row.note}
                    onChange={(event) => change(row.key, { note: event.target.value })}
                  />
                </label>
                {rowErrors.map((message) => (
                  <p key={message} className="text-xs text-destructive">
                    {message}
                  </p>
                ))}
              </li>
            );
          })}
        </ul>
      ) : (
        <p id={`${id}-empty`} className="text-sm text-muted-foreground">
          Sin ofertas cargadas. En Arma tu PC igual salen los botones de búsqueda.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={add}
          disabled={rows.length >= 20}
        >
          <PlusIcon aria-hidden />
          Agregar oferta
        </Button>
        {rows.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setRows((current) => current.map((row) => ({ ...row, checkedAt: today() })))
            }
          >
            <CalendarCheckIcon aria-hidden />
            Revisadas hoy
          </Button>
        )}
        <Button type="button" size="sm" isLoading={pending} onClick={save} className="ml-auto">
          Guardar ofertas
        </Button>
      </div>
    </div>
  );
}
