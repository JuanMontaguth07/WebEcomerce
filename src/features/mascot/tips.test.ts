import { describe, expect, it } from "vitest";
import { PART_KINDS } from "@/features/compatibility/types";
import { tipsFor, topicFromPath } from "./tips";

describe("consejos de Kovi", () => {
  it("elige el tema por la dirección", () => {
    expect(topicFromPath("/")).toBe("home");
    expect(topicFromPath("/arma-tu-pc/Ab3dEf6hJk9m")).toBe("architect");
    expect(topicFromPath("/carrito")).toBe("cart");
    expect(topicFromPath("/checkout")).toBe("checkout");
    expect(topicFromPath("/pedido/123")).toBe("order");
    expect(topicFromPath("/categorias/gpu")).toBe("catalog");
    expect(topicFromPath("/productosx")).toBe("home");
    expect(topicFromPath("/soporte")).toBe("home");
  });

  it("todo tema tiene consejos cortos", () => {
    const topics = [
      ...PART_KINDS,
      "home",
      "catalog",
      "cart",
      "checkout",
      "order",
      "architect",
    ] as const;
    for (const topic of topics) {
      const tips = tipsFor(topic);
      expect(tips.length, topic).toBeGreaterThan(0);
      for (const tip of tips) expect(tip.text.length, tip.text).toBeLessThanOrEqual(130);
    }
  });
});
