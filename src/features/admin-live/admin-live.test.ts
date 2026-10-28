import { describe, expect, it } from "vitest";
import {
  arrivedAfter,
  dayLabel,
  firstUnread,
  groupByDay,
  isContinuation,
  mergeMessage,
  mergeReaction,
  reactionSummary,
  seenBy,
  seenLabel,
  snippet,
  timeAgo,
  unreadAlerts,
  unreadMessages,
} from "./format";
import type { ChatMessage, LiveAlert, MessageReaction } from "./types";

const now = Date.parse("2026-10-27T20:00:00Z"); // 3:00 p. m. en Bogotá
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("tiempos al estilo iOS", () => {
  it("dice ahora, minutos, horas o la hora del día", () => {
    expect(timeAgo(ago(10_000), now)).toBe("ahora");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("hace 5 min");
    expect(timeAgo(ago(2 * 3_600_000), now)).toBe("hace 2 h");
    expect(timeAgo(ago(8 * 3_600_000), now)).toMatch(/^7:00/);
  });

  it("agrupa por Hoy, Ayer y el nombre del día, en hora de Colombia", () => {
    expect(dayLabel(ago(60_000), now)).toBe("Hoy");
    expect(dayLabel(ago(24 * 3_600_000), now)).toBe("Ayer");
    expect(dayLabel("2026-10-20T15:00:00Z", now)).toBe("Martes, 20 de octubre");
    const groups = groupByDay(
      [{ createdAt: ago(1000) }, { createdAt: ago(2000) }, { createdAt: ago(25 * 3_600_000) }],
      now,
    );
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ["Hoy", 2],
      ["Ayer", 1],
    ]);
  });
});

describe("sin leer", () => {
  const alert = (actorId: string | null, ms: number): LiveAlert => ({
    id: String(ms),
    kind: "order_new",
    title: "x",
    body: null,
    href: null,
    actorId,
    createdAt: ago(ms),
  });

  it("no cuenta lo que hizo uno mismo ni lo ya leído", () => {
    const alerts = [alert(null, 1000), alert("yo", 2000), alert("otra", 3000), alert(null, 99_000)];
    expect(unreadAlerts(alerts, "yo", ago(50_000))).toBe(2);
    expect(unreadAlerts(alerts, "yo", null)).toBe(3);
  });

  it("en el chat solo cuentan los mensajes de los demás", () => {
    const messages: ChatMessage[] = [
      { id: "1", authorId: "yo", body: "hola", createdAt: ago(1000) },
      { id: "2", authorId: "otra", body: "hola", createdAt: ago(500) },
    ];
    expect(unreadMessages(messages, "yo", ago(60_000))).toBe(1);
  });
});

describe("mensajes", () => {
  const message = (id: string, authorId: string, ms: number): ChatMessage => ({
    id,
    authorId,
    body: id,
    createdAt: ago(ms),
  });

  it("no duplica un mensaje que llega dos veces y mantiene el orden", () => {
    let list = [message("a", "yo", 3000)];
    list = mergeMessage(list, message("c", "otra", 1000));
    list = mergeMessage(list, message("b", "yo", 2000));
    list = mergeMessage(list, message("b", "yo", 2000));
    expect(list.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(mergeMessage(list, message("d", "yo", 0), 2).map((item) => item.id)).toEqual(["c", "d"]);
  });

  it("agrupa mensajes seguidos del mismo autor en menos de 5 minutos", () => {
    expect(isContinuation(message("a", "yo", 120_000), message("b", "yo", 0))).toBe(true);
    expect(isContinuation(message("a", "yo", 10 * 60_000), message("b", "yo", 0))).toBe(false);
    expect(isContinuation(message("a", "otra", 1000), message("b", "yo", 0))).toBe(false);
    expect(isContinuation(undefined, message("b", "yo", 0))).toBe(false);
  });

  it("sabe quién vio un mensaje aunque las horas vengan en formatos distintos", () => {
    const sent = { ...message("a", "yo", 60_000), createdAt: "2026-10-27T19:59:00.123456+00:00" };
    const people = [{ id: "ana" }, { id: "luis" }, { id: "eva" }];
    const reads = { ana: "2026-10-27T19:59:00.123456+00:00", luis: "2026-10-27T19:58:00Z" };
    expect(seenBy(people, reads, sent).map((person) => person.id)).toEqual(["ana"]);
  });

  it("dice Visto, por quién o por todos", () => {
    expect(seenLabel(["Ana Ruiz"], 1)).toBe("Visto");
    expect(seenLabel(["Ana Ruiz"], 3)).toBe("Visto por Ana");
    expect(seenLabel(["Ana Ruiz", "Luis Mora"], 3)).toBe("Visto por Ana y Luis");
    expect(seenLabel(["Ana", "Luis", "Eva"], 3)).toBe("Visto por todos");
  });

  it("encuentra el primer mensaje nuevo de otro y cuenta los que llegaron después", () => {
    const list = [
      message("a", "otra", 5000),
      message("b", "yo", 4000),
      message("c", "otra", 2000),
      message("d", "otra", 1000),
    ];
    expect(firstUnread(list, "yo", ago(4500))?.id).toBe("c");
    expect(firstUnread(list, "yo", null)?.id).toBe("a");
    expect(firstUnread(list, "yo", ago(0))).toBeUndefined();
    expect(arrivedAfter(list, "yo", ago(3000))).toBe(2);
    expect(arrivedAfter(list, "yo", null)).toBe(0);
  });
});

describe("reacciones y citas", () => {
  const r = (
    id: string,
    userId: string,
    emoji: MessageReaction["emoji"],
    messageId = "m",
  ): MessageReaction => ({
    id,
    messageId,
    userId,
    emoji,
  });

  it("agrupa por emoji en el orden del selector y marca las propias", () => {
    const list = [
      r("1", "ana", "🔥"),
      r("2", "yo", "👍"),
      r("3", "ana", "👍"),
      r("4", "ana", "👍", "otro"),
    ];
    expect(reactionSummary(list, "m", "yo")).toEqual([
      { emoji: "👍", userIds: ["yo", "ana"], mine: true },
      { emoji: "🔥", userIds: ["ana"], mine: false },
    ]);
    expect(reactionSummary(list, "nada", "yo")).toEqual([]);
  });

  it("la reacción confirmada reemplaza a la provisional sin duplicarla", () => {
    const pending = { ...r("pendiente-1", "yo", "👍"), pending: true };
    const list = mergeReaction(mergeReaction([], pending), r("real", "yo", "👍"));
    expect(list).toEqual([r("real", "yo", "👍")]);
    expect(mergeReaction(list, r("real", "yo", "👍"))).toHaveLength(1);
    expect(mergeReaction(list, r("otra", "yo", "🔥"))).toHaveLength(2);
  });

  it("cita en una línea y recorta lo largo", () => {
    expect(snippet("Hola\n\n  equipo")).toBe("Hola equipo");
    expect(snippet("a".repeat(120), 10)).toBe("aaaaaaaaa…");
  });
});
