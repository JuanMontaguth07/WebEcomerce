"use client";

import { CheckCircle2Icon, ImageUpIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicOrder } from "@/features/orders/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Lado más largo de la imagen que se envía: suficiente para leer un comprobante. */
const MAX_SIDE = 1600;
/** La base acepta hasta 2,5 MB; se apunta por debajo. */
const MAX_BYTES = 2_000_000;

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

type Prepared = { base64: string; mime: string; width: number; height: number };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Achica la foto o captura en el navegador (WebP, o JPEG si el navegador no
 * sabe hacer WebP) para que llegue liviana aunque sea una foto del celular.
 */
async function prepare(file: File): Promise<Prepared> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  // Fondo blanco por si la captura tiene transparencia (JPEG no la admite).
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let blob: Blob | null = null;
  for (const quality of [0.85, 0.7, 0.55]) {
    blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob || blob.size > MAX_BYTES) throw new Error("grande");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return { base64: btoa(binary), mime: blob.type, width, height };
}

const MESSAGES: Record<string, string> = {
  NOT_PENDING: "Este pedido ya no está pendiente de pago.",
  TOO_MANY: "Ya enviaste varios comprobantes. Escríbenos por WhatsApp y lo revisamos.",
  INVALID_IMAGE: "No pude leer esa imagen. Envía una captura de pantalla del pago.",
  TOO_LARGE: "La imagen es muy pesada. Envía una captura de pantalla del pago.",
  NOT_FOUND: "No encontramos el pedido. Abre de nuevo el enlace que te enviamos.",
};

/**
 * El cliente sube la captura del pago desde su pedido. La revisamos en el panel
 * y aquí ve si está en revisión, aprobada o qué falta si la rechazamos.
 */
export function ReceiptUpload({
  orderId,
  token,
  receipt,
  amount,
}: {
  orderId: string;
  token: string;
  receipt: PublicOrder["receipt"];
  amount: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [another, setAnother] = useState(false);
  const id = useId();
  // La vista local se libera al cambiar de archivo o al salir de la página.
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function choose(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(previewRef.current);
    setError(null);
  }

  async function send() {
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      const image = await prepare(file).catch(() => {
        throw new Error("INVALID_IMAGE");
      });
      const { error: rpcError } = await createClient().rpc("submit_payment_receipt", {
        p_order_id: orderId,
        p_token: token,
        p_image: image.base64,
        p_mime: image.mime,
        p_width: image.width,
        p_height: image.height,
        p_note: note.trim() || undefined,
      });
      if (rpcError) throw new Error(rpcError.message);
      choose(null);
      setNote("");
      setAnother(false);
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(MESSAGES[code] ?? "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (receipt?.status === "pending" && !another) {
    return (
      <div
        className="grid gap-2 rounded-xl border border-success/40 bg-success/5 p-4"
        role="status"
      >
        <p className="flex items-center gap-2 font-semibold text-success">
          <CheckCircle2Icon className="size-5" aria-hidden />
          Recibimos tu comprobante
        </p>
        <p className="text-sm text-muted-foreground">
          Lo enviaste el {dateFormatter.format(new Date(receipt.createdAt))}. Lo estamos revisando;
          mientras tanto tu pedido no se cancela.
        </p>
        <button
          type="button"
          onClick={() => setAnother(true)}
          className="w-fit text-sm font-semibold text-primary hover:underline"
        >
          Enviar otro comprobante
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {receipt?.status === "rejected" && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm"
        >
          <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>
            <strong>No pudimos validar tu comprobante.</strong>{" "}
            {receipt.reviewNote ?? "Revisa que sea del valor del pedido."} Sube otro, por favor.
          </span>
        </p>
      )}

      <label
        htmlFor={`${id}-file`}
        className={cn(
          "grid cursor-pointer gap-3 rounded-xl border-2 border-dashed bg-background p-4 transition-colors hover:border-primary/60",
          preview
            ? "grid-cols-[auto_minmax(0,1fr)] items-center"
            : "justify-items-center py-6 text-center",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista local del archivo elegido
          <img
            src={preview}
            alt=""
            className="h-24 w-auto max-w-28 rounded-lg border object-cover"
          />
        ) : (
          <ImageUpIcon className="size-8 text-primary" aria-hidden />
        )}
        <span className="grid gap-0.5">
          <span className="font-semibold">
            {preview ? file?.name : "Sube la captura de tu pago"}
          </span>
          <span className="text-sm text-muted-foreground">
            {preview
              ? "Toca para cambiarla."
              : `La captura de Nequi donde se ve la transferencia de ${amount}.`}
          </span>
        </span>
        <input
          id={`${id}-file`}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
      </label>

      {file && (
        <>
          <label htmlFor={`${id}-note`} className="grid gap-1.5 text-sm">
            <span className="font-medium">
              ¿Algo que debamos saber? <span className="text-muted-foreground">(opcional)</span>
            </span>
            <textarea
              id={`${id}-note`}
              rows={2}
              maxLength={300}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Por ejemplo: pagué desde el Nequi de mi hermana."
              className="resize-none rounded-lg border bg-background px-3 py-2 outline-none focus-visible:border-primary"
            />
          </label>
          <Button type="button" onClick={() => void send()} disabled={sending} className="w-fit">
            {sending && <Loader2Icon className="animate-spin" aria-hidden />}
            {sending ? "Enviando…" : "Enviar comprobante"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
