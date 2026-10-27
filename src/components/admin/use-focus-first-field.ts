"use client";

import { useEffect, type RefObject } from "react";

const FIRST_FIELD =
  "input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]):not([readonly]):not([disabled]), textarea:not([disabled]), select:not([disabled])";

/**
 * Al abrir un formulario (crear o editar) lo trae a la vista y deja el cursor en
 * su primer campo, para escribir de una vez. `openKey` cambia cada vez que se abre
 * otro registro (p. ej. el id, o "nuevo"); null = cerrado.
 */
export function useFocusFirstField(ref: RefObject<HTMLElement | null>, openKey: string | null) {
  useEffect(() => {
    const form = ref.current;
    if (!openKey || !form) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    form.querySelector<HTMLElement>(FIRST_FIELD)?.focus({ preventScroll: true });
  }, [ref, openKey]);
}
