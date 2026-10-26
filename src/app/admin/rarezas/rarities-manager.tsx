"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, TextAreaField, TextField } from "@/components/admin/form-helpers";
import { AdminEmpty } from "@/components/admin/admin-ui";
import { RarityPreview } from "@/components/admin/rarity-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteRarity, saveRarity } from "@/features/rarities/actions";
import type { AdminRarity } from "@/features/rarities/queries";
import { RARITY_EFFECT_KEYS, RARITY_EFFECTS, type RarityEffect } from "@/features/rarities/types";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<string, string[]>>;
type Draft = {
  id?: string;
  name: string;
  slug: string;
  color: string;
  effect: RarityEffect;
  description: string;
  position: string;
  isActive: boolean;
};

/** Colores sugeridos: se ven bien como borde y halo en modo claro y oscuro. */
const SWATCHES = [
  "#2F80ED",
  "#9B51E0",
  "#F2A900",
  "#E0115F",
  "#14B8A6",
  "#22C55E",
  "#F97316",
  "#64748B",
];

const toDraft = (rarity: AdminRarity): Draft => ({
  id: rarity.id,
  name: rarity.name,
  slug: rarity.slug,
  color: rarity.color,
  effect: rarity.effect,
  description: rarity.description ?? "",
  position: String(rarity.position),
  isActive: rarity.isActive,
});

export function RaritiesManager({ rarities }: { rarities: AdminRarity[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function open(next: Draft) {
    setErrors({});
    setSlugTouched(Boolean(next.id));
    setDraft(next);
    // En pantallas pequeñas el formulario queda debajo de la lista.
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const result = await saveRarity(draft);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(draft.id ? "Rareza actualizada en toda la tienda" : "Rareza creada");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteRarity({ id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Rareza eliminada. Sus productos quedaron sin rareza.");
      setDeleting(null);
      router.refresh();
    });
  }

  const nextPosition = Math.min(100, Math.max(0, ...rarities.map((r) => r.position)) + 1);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_26rem]">
      <section aria-label="Rarezas creadas" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Del mejor nivel al más básico. Asígnalas en cada producto o en lote desde la lista de
            productos.
          </p>
          <Button
            onClick={() =>
              open({
                name: "",
                slug: "",
                color: SWATCHES[0] ?? "#2F80ED",
                effect: "glow",
                description: "",
                position: String(nextPosition),
                isActive: true,
              })
            }
          >
            <PlusIcon aria-hidden />
            Nueva rareza
          </Button>
        </div>

        {rarities.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rarities.map((rarity) => (
              <li
                key={rarity.id}
                className={cn(
                  "grid gap-4 rounded-xl border bg-card p-4",
                  draft?.id === rarity.id && "border-primary ring-3 ring-ring/20",
                )}
              >
                <div className="flex gap-4">
                  <RarityPreview
                    rarity={rarity}
                    label={rarity.name}
                    className="max-w-32 shrink-0"
                  />
                  <div className="grid min-w-0 content-start gap-1.5">
                    <h3 className="font-bold">{rarity.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {RARITY_EFFECTS[rarity.effect].label} · nivel {rarity.position}
                    </p>
                    {rarity.description && (
                      <p className="text-sm text-muted-foreground">{rarity.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {!rarity.isActive && <Badge variant="outline">Oculta</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Link
                    href={`/admin/productos?rareza=${rarity.id}`}
                    className="mr-auto text-sm font-semibold text-primary hover:underline"
                  >
                    {rarity.productCount} {rarity.productCount === 1 ? "producto" : "productos"}
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => open(toDraft(rarity))}>
                    <PencilIcon aria-hidden />
                    Editar
                  </Button>
                  {deleting === rarity.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={pending}
                        onClick={() => remove(rarity.id)}
                      >
                        Sí, eliminar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
                        No
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Eliminar ${rarity.name}`}
                      onClick={() => setDeleting(rarity.id)}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty>
            Aún no hay niveles. Crea el primero para mostrar la calidad de tus productos.
          </AdminEmpty>
        )}
      </section>

      {draft && (
        <form
          onSubmit={save}
          noValidate
          aria-label={draft.id ? "Editar rareza" : "Nueva rareza"}
          ref={formRef}
          className="grid scroll-mt-20 gap-5 rounded-xl border bg-card p-5"
        >
          <h2 className="text-lg font-bold">
            {draft.id ? `Editar «${draft.name}»` : "Nueva rareza"}
          </h2>

          <div className="grid justify-items-center rounded-xl border border-dashed bg-background p-5">
            <RarityPreview rarity={draft} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="name"
              label="Nombre"
              errors={errors}
              maxLength={40}
              placeholder="Legendaria"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
            />
            <TextField
              name="slug"
              label="Slug"
              errors={errors}
              hint="Identificador interno, sin espacios."
              value={draft.slug}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", slugify(event.target.value));
              }}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Color</legend>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Usar ${swatch}`}
                  aria-pressed={draft.color.toUpperCase() === swatch}
                  onClick={() => set("color", swatch)}
                  className="size-8 rounded-full border-2 border-card ring-1 ring-border transition-transform hover:scale-110 aria-pressed:ring-3 aria-pressed:ring-foreground"
                  style={{ background: swatch }}
                />
              ))}
              <label className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(event) => set("color", event.target.value.toUpperCase())}
                  className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Elegir otro color"
                />
                <span className="font-mono text-xs">{draft.color.toUpperCase()}</span>
              </label>
            </div>
            {errors.color && <p className="text-sm text-destructive">{errors.color[0]}</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Efecto</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {RARITY_EFFECT_KEYS.map((effect) => (
                <label
                  key={effect}
                  className="flex cursor-pointer gap-3 rounded-lg border bg-background p-3 text-sm transition-colors has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
                >
                  <input
                    type="radio"
                    name="effect"
                    value={effect}
                    checked={draft.effect === effect}
                    onChange={() => set("effect", effect)}
                    className="sr-only"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{RARITY_EFFECTS[effect].label}</span>
                    <span className="text-xs text-muted-foreground">
                      {RARITY_EFFECTS[effect].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <TextAreaField
            name="description"
            label="Descripción"
            optional
            errors={errors}
            maxLength={200}
            rows={2}
            hint="Aparece en la ficha del producto, junto al nivel."
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
          />
          <TextField
            name="position"
            label="Nivel (0 a 100)"
            errors={errors}
            inputMode="numeric"
            hint="Mayor = mejor gama. Ordena los niveles en el panel."
            value={draft.position}
            onChange={(event) => set("position", event.target.value.replace(/\D/g, ""))}
          />
          <CheckboxField
            name="isActive"
            label="Activa"
            hint="Si la apagas, sus productos se ven como productos normales."
            checked={draft.isActive}
            onCheckedChange={(checked) => set("isActive", checked)}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" isLoading={pending}>
              {draft.id ? "Guardar cambios" : "Crear rareza"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
