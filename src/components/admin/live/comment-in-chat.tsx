"use client";

import { MessageCirclePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLive } from "./live-provider";

/** Abre el chat del equipo con este pedido (#1042) o este producto ya puesto. */
export function CommentInChatButton({ text, productId }: { text?: string; productId?: string }) {
  const { composeInChat } = useLive();
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => composeInChat({ text, productId })}
    >
      <MessageCirclePlusIcon aria-hidden />
      Comentar en el chat
    </Button>
  );
}
