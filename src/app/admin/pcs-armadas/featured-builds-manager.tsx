"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  StarIcon,
  StarOffIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { dateTime } from "@/components/admin/admin-ui";
import { TextAreaField, TextField } from "@/components/admin/form-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addFeaturedBuild,
  clearSpotlightBuild,
  deleteFeaturedBuild,
  reorderFeaturedBuilds,
  setSpotlightBuild,
  updateFeaturedBuild,
} from "@/features/architect/featured-actions";
import type { AdminFeaturedBuild, RecentBuild } from "@/features/architect/featured-queries";
import { formatCOP } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;
type Draft = { link: string; title: string; tag: string; description: string };
const EMPTY: Draft = { link: "", title: "", tag: "", description: "" };

export function FeaturedBuildsManager({
  featured,
  recent,
}: {
  featured: AdminFeaturedBuild[];
  recent: RecentBuild[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(featured);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [spotlighting, setSpotlighting] = useState<string | null>(null);
  // Hora al abrir la página, para saber si la PC de la semana ya terminó.
  const [openedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const id = useId();

  // Si el servidor trae otra lista (otro admin la cambió), se usa esa.
  const [seen, setSeen] = useState(featured);
  if (seen !== featured) {
    setSeen(featured);
    setOrder(featured);
  }

  const field = (key: keyof Draft) => ({
    name: key,
    errors,
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((current) => ({ ...current, [key]: event.target.value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
    },
  });

  function add(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addFeaturedBuild(draft);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      setDraft(EMPTY);
      setErrors({});
      toast.success("Listo: ya sale en Arma tu PC");
      router.refresh();
    });
  }

  function move(index: number, delta: number) {
    const next = [...order];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    setOrder(next);
    startTransition(async () => {
      const result = await reorderFeaturedBuilds({ ids: next.map((build) => build.id) });
      if (!result.ok) {
        toast.error(result.error.message);
        setOrder(featured);
      }
    });
  }

  function save(build: AdminFeaturedBuild, patch: Partial<AdminFeaturedBuild>) {
    const next = { ...build, ...patch };
    startTransition(async () => {
      const result = await updateFeaturedBuild({
        id: next.id,
        title: next.title,
        tag: next.tag ?? "",
        description: next.description ?? "",
        isActive: next.isActive,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function spotlight(build: AdminFeaturedBuild, until: string, note: string) {
    startTransition(async () => {
      const result = await setSpotlightBuild({ id: build.id, until, note });
      if (!result.ok) {
        toast.error(result.error.fieldErrors?.until?.[0] ?? result.error.message);
        return;
      }
      setSpotlighting(null);
      toast.success(`«${build.title}» es la PC de la semana`);
      router.refresh();
    });
  }

  function unspotlight(build: AdminFeaturedBuild) {
    startTransition(async () => {
      const result = await clearSpotlightBuild({ id: build.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Ya no es la PC de la semana");
      router.refresh();
    });
  }

  function remove(build: AdminFeaturedBuild) {
    startTransition(async () => {
      const result = await deleteFeaturedBuild({ id: build.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Quitada de las recomendadas (la configuración sigue guardada)");
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 gap-6">
        <section aria-labelledby={`${id}-list`} className="grid gap-3">
          <h2 id={`${id}-list`} className="text-lg font-bold">
            Recomendadas · {order.length}
          </h2>
          {order.length ? (
            <ul className="grid gap-3">
              {order.map((build, index) => (
                <li key={build.id} className="grid gap-3 rounded-2xl border bg-card p-4">
                  {spotlighting === build.id ? (
                    <SpotlightForm
                      build={build}
                      pending={pending}
                      onCancel={() => setSpotlighting(null)}
                      onSave={(until, note) => spotlight(build, until, note)}
                    />
                  ) : editing === build.id ? (
                    <EditForm
                      build={build}
                      pending={pending}
                      onCancel={() => setEditing(null)}
                      onSave={(patch) => save(build, patch)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid min-w-0 gap-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{build.title}</span>
                          {build.tag && <Badge variant="soft">{build.tag}</Badge>}
                          {!build.isActive && <Badge variant="outline">Oculta</Badge>}
                          {build.spotlightUntil && (
                            <Badge className="bg-primary text-primary-foreground">
                              {Date.parse(build.spotlightUntil) > openedAt
                                ? `PC de la semana · hasta ${dateTime.format(new Date(build.spotlightUntil))}`
                                : "PC de la semana · terminó"}
                            </Badge>
                          )}
                        </p>
                        {build.description && (
                          <p className="text-sm text-muted-foreground">{build.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          «{build.name}» · {formatCOP(build.total)} al guardarla ·{" "}
                          <Link
                            href={`/arma-tu-pc/${build.code}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Abrir
                            <ExternalLinkIcon className="size-3" aria-hidden />
                          </Link>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0 || pending}
                          aria-label={`Subir ${build.title}`}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUpIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === order.length - 1 || pending}
                          aria-label={`Bajar ${build.title}`}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDownIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            build.isActive ? `Ocultar ${build.title}` : `Mostrar ${build.title}`
                          }
                          title={build.isActive ? "Ocultar" : "Mostrar"}
                          disabled={pending}
                          onClick={() => save(build, { isActive: !build.isActive })}
                        >
                          {build.isActive ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            build.spotlightUntil
                              ? `Quitar ${build.title} como PC de la semana`
                              : `Hacer ${build.title} la PC de la semana`
                          }
                          title={
                            build.spotlightUntil ? "Quitar de PC de la semana" : "PC de la semana"
                          }
                          disabled={pending}
                          onClick={() =>
                            build.spotlightUntil ? unspotlight(build) : setSpotlighting(build.id)
                          }
                        >
                          {build.spotlightUntil ? (
                            <StarOffIcon aria-hidden />
                          ) : (
                            <StarIcon aria-hidden />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${build.title}`}
                          onClick={() => setEditing(build.id)}
                        >
                          <PencilIcon aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar ${build.title} de las recomendadas`}
                          disabled={pending}
                          onClick={() => remove(build)}
                        >
                          <Trash2Icon aria-hidden />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
              Aún no hay PCs recomendadas. Arma una en «Arma tu PC», guárdala y pega su enlace aquí
              al lado, o recomienda una de las que guardaron tus clientes.
            </p>
          )}
        </section>

        <section aria-labelledby={`${id}-recent`} className="grid gap-3">
          <h2 id={`${id}-recent`} className="text-lg font-bold">
            Últimas configuraciones guardadas
          </h2>
          <p className="-mt-1 text-sm text-muted-foreground">
            Lo que arman y comparten tus clientes: sirve para saber qué piezas tener en stock.
          </p>
          {recent.length ? (
            <ul className="grid divide-y rounded-2xl border bg-card">
              {recent.map((build) => (
                <li
                  key={build.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-semibold">{build.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {dateTime.format(new Date(build.createdAt))} · {build.parts}{" "}
                      {build.parts === 1 ? "pieza" : "piezas"} · {formatCOP(build.total)}
                      {build.source === "demo" ? " · con piezas demo" : ""}
                      {build.mode === "guided" ? " · modo guiado" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/arma-tu-pc/${build.code}`} target="_blank">
                        Ver
                        <ExternalLinkIcon aria-hidden />
                      </Link>
                    </Button>
                    {build.featured ? (
                      <Badge variant="soft">Recomendada</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setDraft({
                            link: build.code,
                            title: build.name,
                            tag: "",
                            description: "",
                          });
                          document
                            .querySelector<HTMLInputElement>(
                              `#${CSS.escape(`${id}-form`)} input[name="title"]`,
                            )
                            ?.focus();
                        }}
                      >
                        <SparklesIcon aria-hidden />
                        Recomendar
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nadie ha guardado configuraciones todavía.
            </p>
          )}
        </section>
      </div>

      <form
        id={`${id}-form`}
        onSubmit={add}
        noValidate
        className="grid gap-4 rounded-2xl border bg-card p-5 xl:sticky xl:top-20"
      >
        <h2 className="text-lg font-bold">Agregar una PC armada</h2>
        <TextField
          {...field("link")}
          label="Enlace o código de la configuración"
          placeholder="https://…/arma-tu-pc/Ab3dEf6hJk9m"
          hint="El que da «Guardar y compartir» en Arma tu PC."
        />
        <TextField {...field("title")} label="Título" maxLength={60} placeholder="Gamer 1080p" />
        <TextField
          {...field("tag")}
          label="Etiqueta"
          optional
          maxLength={30}
          placeholder="Para jugar · Oficina · Streaming"
        />
        <TextAreaField
          {...field("description")}
          label="Descripción"
          optional
          maxLength={240}
          rows={3}
          placeholder="Juegos actuales en alto a 1080p, silenciosa y con espacio para crecer."
        />
        <Button type="submit" isLoading={pending}>
          <PlusIcon aria-hidden />
          Agregar a recomendadas
        </Button>
      </form>
    </div>
  );
}

function EditForm({
  build,
  pending,
  onCancel,
  onSave,
}: {
  build: AdminFeaturedBuild;
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<AdminFeaturedBuild>) => void;
}) {
  const [title, setTitle] = useState(build.title);
  const [tag, setTag] = useState(build.tag ?? "");
  const [description, setDescription] = useState(build.description ?? "");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ title, tag: tag || null, description: description || null });
      }}
      className="grid gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          name="title"
          label="Título"
          errors={{}}
          maxLength={60}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextField
          name="tag"
          label="Etiqueta"
          errors={{}}
          optional
          maxLength={30}
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        />
      </div>
      <TextAreaField
        name="description"
        label="Descripción"
        errors={{}}
        optional
        maxLength={240}
        rows={2}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={pending}>
          Guardar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** «AAAA-MM-DDTHH:mm» en la hora del navegador, para un campo datetime-local. */
function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SpotlightForm({
  build,
  pending,
  onCancel,
  onSave,
}: {
  build: AdminFeaturedBuild;
  pending: boolean;
  onCancel: () => void;
  onSave: (until: string, note: string) => void;
}) {
  // Por defecto, una semana: hasta el mismo día de la próxima semana a las 11:59 p. m.
  const [until, setUntil] = useState(() => {
    const date = new Date(Date.now() + 7 * 86_400_000);
    date.setHours(23, 59, 0, 0);
    return localInput(date);
  });
  const [note, setNote] = useState(build.spotlightNote ?? "");
  const [min] = useState(() => localInput(new Date(Date.now() + 60_000)));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const date = new Date(until);
        if (Number.isNaN(date.getTime())) return;
        onSave(date.toISOString(), note);
      }}
      className="grid gap-3"
    >
      <p className="text-sm">
        <span className="font-semibold">«{build.title}» como PC de la semana.</span>{" "}
        <span className="text-muted-foreground">
          Sale en una banda con cuenta regresiva en Arma tu PC y desaparece sola al terminar. Si
          había otra, la reemplaza.
        </span>
      </p>
      <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
        <TextField
          name="until"
          label="Hasta"
          type="datetime-local"
          errors={{}}
          min={min}
          value={until}
          onChange={(event) => setUntil(event.target.value)}
        />
        <TextField
          name="note"
          label="Texto de la banda"
          optional
          errors={{}}
          maxLength={140}
          placeholder="Con envío gratis a todo el país"
          hint="Si lo dejas vacío, se usa la descripción."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={pending}>
          <StarIcon aria-hidden />
          Hacer PC de la semana
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
