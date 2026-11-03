"use client";

import { useEffect } from "react";
import { mascotStore } from "@/features/mascot/store";
import type { MascotTopic } from "@/features/mascot/tips";

/** Le dice a Kovi de qué trata la página (p. ej. la ficha de una gráfica). */
export function MascotTopicSetter({ topic }: { topic: MascotTopic | null }) {
  useEffect(() => {
    mascotStore.setTopic(topic);
    return () => mascotStore.setTopic(null);
  }, [topic]);
  return null;
}
