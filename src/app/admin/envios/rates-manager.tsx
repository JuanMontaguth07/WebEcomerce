"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, SelectField, TextField } from "@/components/admin/form-helpers";
import { AdminEmpty, AdminTable, AdminTh } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS } from "@/features/checkout/departments";
import { deleteShippingRate, saveShippingRate } from "@/features/shipping/actions";
import { deliveryLabel, type ShippingRate } from "@/features/shipping/types";
import { formatCOP } from "@/lib/format";

type Errors = Partial<Record<string, string[]>>;
type Draft = {
  id?: string;
  department: string;
  city: string;
  price: string;
  minDays: string;
  maxDays: string;
  isActive: boolean;
};

const EMPTY_DRAFT: Draft = {
  department: "",
  city: "",
  price: "",
  minDays: "",
  maxDays: "",
  isActive: true,
};

const toDraft = (rate: ShippingRate): Draft => ({
  id: rate.id,
  department: rate.department,
  city: rate.city ?? "",
  price: String(rate.price),
  minDays: rate.minDays === null ? "" : String(rate.minDays),
  maxDays: rate.maxDays === null ? "" : String(rate.maxDays),
  isActive: rate.isActive,
});

export function RatesManager({ rates }: { rates: ShippingRate[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (next: Draft) => {
    setErrors({});
    setDraft(next);
  };
  const set = (key: keyof Draft, value: string | boolean) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const result = await saveShippingRate({
        ...draft,
        department: draft.department as (typeof DEPARTMENTS)[number],
      });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success(draft.id ? "Tarifa actualizada" : "Tarifa creada");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteShippingRate({ id });
      if (result.ok) {
        toast.success("Tarifa eliminada");
        router.refresh();
      } else toast.error(result.error.message);
      setDeleting(null);
    });
  }

  const text = (key: keyof Draft) => ({
    name: key,
    errors,
    value: String(draft?.[key] ?? ""),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      set(key, event.target.value),
  });

  return (
    <div className="grid gap-6">
      {draft ? (
        <form
          onSubmit={save}
          noValidate
          className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6"
          aria-label={draft.id ? "Editar tarifa" : "Nueva tarifa"}
        >
          <p className="text-lg font-bold">{draft.id ? "Editar tarifa" : "Nueva tarifa"}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              {...text("department")}
              label="Departamento"
              options={[
                { value: "", label: "Selecciona…" },
                ...DEPARTMENTS.map((department) => ({ value: department, label: department })),
              ]}
            />
            <TextField
              {...text("city")}
              label="Ciudad"
              optional
              maxLength={80}
              placeholder="Vacío = todo el departamento"
              hint="Déjala vacía para la tarifa general del departamento. Una ciudad tiene prioridad sobre su departamento."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              {...text("price")}
              label="Valor del envío (COP)"
              inputMode="numeric"
              hint="0 = envío gratis a este lugar."
            />
            <TextField
              {...text("minDays")}
              label="Días hábiles (mín.)"
              optional
              inputMode="numeric"
            />
            <TextField
              {...text("maxDays")}
              label="Días hábiles (máx.)"
              optional
              inputMode="numeric"
            />
          </div>
          <CheckboxField
            name="isActive"
            label="Activa"
            hint="Si la desactivas, se usa la tarifa del departamento o queda «por confirmar»."
            checked={draft.isActive}
            onCheckedChange={(checked) => set("isActive", checked)}
          />
          <div className="flex gap-2">
            <Button type="submit" isLoading={pending}>
              {draft.id ? "Guardar cambios" : "Crear tarifa"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" onClick={() => open(EMPTY_DRAFT)}>
            <PlusIcon aria-hidden />
            Agregar tarifa
          </Button>
        </div>
      )}

      {rates.length ? (
        <AdminTable caption="Tarifas de envío">
          <thead>
            <tr>
              <AdminTh>Departamento</AdminTh>
              <AdminTh>Ciudad</AdminTh>
              <AdminTh className="text-right">Valor</AdminTh>
              <AdminTh>Entrega</AdminTh>
              <AdminTh>Estado</AdminTh>
              <AdminTh>
                <span className="sr-only">Acciones</span>
              </AdminTh>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id}>
                <td className="font-medium">{rate.department}</td>
                <td className={rate.city ? "" : "text-muted-foreground"}>
                  {rate.city ?? "Todo el departamento"}
                </td>
                <td className="text-right font-semibold tabular-nums">
                  {rate.price === 0 ? "Gratis" : formatCOP(rate.price)}
                </td>
                <td className="text-muted-foreground">{deliveryLabel(rate) ?? "—"}</td>
                <td>
                  <Badge variant={rate.isActive ? "success" : "outline"}>
                    {rate.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td>
                  {deleting === rate.id ? (
                    <div
                      className="flex items-center justify-end gap-2"
                      role="alertdialog"
                      aria-label="Eliminar tarifa"
                    >
                      <span className="text-xs">¿Eliminar?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={pending}
                        onClick={() => remove(rate.id)}
                      >
                        Sí, eliminar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => open(toDraft(rate))}
                        aria-label={`Editar tarifa de ${rate.city ?? rate.department}`}
                      >
                        <PencilIcon aria-hidden />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleting(rate.id)}
                        aria-label={`Eliminar tarifa de ${rate.city ?? rate.department}`}
                      >
                        <Trash2Icon className="text-destructive" aria-hidden />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmpty>
          Aún no hay tarifas. Mientras tanto, los pedidos muestran el envío como «por confirmar».
        </AdminEmpty>
      )}
    </div>
  );
}
