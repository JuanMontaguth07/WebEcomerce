import type { PartKind } from "@/features/compatibility/types";

/**
 * Consejos de Kovi, la mascota. Son consejos generales y ciertos (nada de
 * precios ni promesas): por tipo de pieza en su ficha, por página en el resto.
 * Si cambia algo de la tienda (pagos, envíos), revisar estos textos.
 */
export type Tip = { title: string; text: string };

export type MascotTopic =
  PartKind | "home" | "catalog" | "cart" | "checkout" | "order" | "architect";

const BY_KIND: Record<PartKind, Tip[]> = {
  gpu: [
    {
      title: "Gráficas",
      text: "Antes de comprarla, revisa el largo máximo que admite tu gabinete. En Arma tu PC te lo comparo.",
    },
    {
      title: "Gráficas",
      text: "Mira la fuente que pide el fabricante: una gráfica potente con una fuente justa se apaga en pleno juego.",
    },
  ],
  cpu: [
    {
      title: "Procesadores",
      text: "Los Intel con «F» no traen gráficos integrados: con ellos necesitas una tarjeta gráfica.",
    },
    {
      title: "Procesadores",
      text: "El socket tiene que ser el mismo de la placa madre: AM5 con AM5, LGA1700 con LGA1700.",
    },
  ],
  motherboard: [
    {
      title: "Placas madre",
      text: "La placa decide si usas DDR4 o DDR5: no se pueden mezclar.",
    },
    {
      title: "Placas madre",
      text: "Cuenta las ranuras M.2 si piensas poner más de un SSD NVMe.",
    },
  ],
  ram: [
    {
      title: "Memoria",
      text: "Para jugar hoy, 16 GB es lo mínimo; 32 GB si haces streaming o editas video.",
    },
    {
      title: "Memoria",
      text: "Dos módulos rinden mejor que uno del mismo tamaño total: trabajan en doble canal.",
    },
  ],
  storage: [
    {
      title: "Almacenamiento",
      text: "Un SSD NVMe hace que el equipo arranque y los juegos carguen mucho más rápido que un disco duro.",
    },
    {
      title: "Almacenamiento",
      text: "Un disco duro grande sigue siendo buena idea para fotos, videos y copias de seguridad.",
    },
  ],
  psu: [
    {
      title: "Fuentes",
      text: "Deja un 20 % o más de margen sobre el consumo: la fuente trabaja más fresca y silenciosa.",
    },
    {
      title: "Fuentes",
      text: "Las fuentes ATX 3.1 traen el conector 12V-2x6 que piden las gráficas nuevas.",
    },
  ],
  cooler: [
    {
      title: "Refrigeración",
      text: "Revisa la altura del disipador contra la que admite el gabinete antes de comprar.",
    },
    {
      title: "Refrigeración",
      text: "En una líquida lo que tiene que caber es el radiador: 240, 280 o 360 mm según el gabinete.",
    },
  ],
  case: [
    {
      title: "Gabinetes",
      text: "Fíjate en qué formatos de placa admite (ATX, Micro-ATX, Mini-ITX) y el largo máximo de gráfica.",
    },
    {
      title: "Gabinetes",
      text: "Un frente de malla deja entrar más aire que uno de vidrio: el equipo trabaja más fresco.",
    },
  ],
};

const BY_PAGE: Record<Exclude<MascotTopic, PartKind>, Tip[]> = {
  home: [
    {
      title: "¡Hola! Soy Kovi",
      text: "Si vas a armar un PC, en Arma tu PC te digo al momento si las piezas encajan.",
    },
    {
      title: "Búsqueda",
      text: "Presiona «/» para buscar un producto por nombre, marca o SKU.",
    },
  ],
  catalog: [
    {
      title: "Filtros",
      text: "Usa los filtros de la ficha técnica para quedarte solo con lo que encaja en tu equipo.",
    },
    {
      title: "Comparar",
      text: "En Arma tu PC puedes poner dos piezas lado a lado y ver en qué se diferencian.",
    },
  ],
  cart: [
    {
      title: "Carrito",
      text: "Revisa las cantidades antes de seguir: el stock se aparta cuando confirmas el pedido.",
    },
    {
      title: "Envío",
      text: "En el siguiente paso eliges tu ciudad y te mostramos el costo y los días de envío.",
    },
  ],
  checkout: [
    {
      title: "Envío",
      text: "Escribe bien tu ciudad o municipio: con eso calculamos el envío.",
    },
    {
      title: "Pagos",
      text: "Si pagas por Nequi, sube el comprobante en tu pedido y lo confirmamos más rápido.",
    },
  ],
  order: [
    {
      title: "Tu pedido",
      text: "Si pagaste por Nequi, sube aquí el comprobante y lo revisamos.",
    },
  ],
  architect: [
    {
      title: "Arma tu PC",
      text: "Empieza por la gráfica o el procesador: el resto lo elijo para que encaje.",
    },
    {
      title: "Precios",
      text: "Toca «Dónde conseguirla» en una pieza para comparar con MercadoLibre, Amazon y otras tiendas.",
    },
    {
      title: "Compartir",
      text: "Guarda tu configuración y comparte el enlace para pedir una cotización por WhatsApp.",
    },
  ],
};

/** El tema de una página según su dirección (las fichas de producto lo cambian por su pieza). */
export function topicFromPath(pathname: string): MascotTopic {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/arma-tu-pc")) return "architect";
  if (pathname.startsWith("/carrito")) return "cart";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/pedido")) return "order";
  if (/^\/(productos|categorias|marcas|buscar)(\/|$)/.test(pathname)) return "catalog";
  return "home";
}

export function tipsFor(topic: MascotTopic): Tip[] {
  return topic in BY_KIND ? BY_KIND[topic as PartKind] : BY_PAGE[topic as keyof typeof BY_PAGE];
}
