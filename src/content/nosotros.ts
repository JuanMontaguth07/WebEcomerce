/**
 * Historia de la tienda (texto del negocio). La usan la portada (versión corta)
 * y la página /nosotros (completa). Editar aquí actualiza ambas.
 */
export const ABOUT = {
  title: "Sobre nosotros",
  headline: "Empezamos siendo amigos con un sueño",
  paragraphs: [
    "Todo comenzó con un sueño compartido entre amigos: crear nuestro propio espacio en el mundo del hardware y la tecnología.",
    "Al principio no éramos una tienda ni teníamos una gran infraestructura. Éramos personas con una misma pasión, muchas ideas y ganas de hacer algo propio. Comenzamos realizando ventas de manera informal, aprendiendo en cada operación, conociendo a nuestros clientes y descubriendo poco a poco que aquel sueño que parecía lejano comenzaba a hacerse realidad.",
    "Cada venta representaba mucho más que una transacción: era un paso adelante, una motivación para seguir creciendo y una prueba de que podíamos llegar más lejos.",
    "Hoy queremos llevar esa ilusión a otro nivel, construyendo una tienda donde la tecnología, los buenos precios y la confianza sean parte de la misma experiencia.",
  ],
  closing:
    "No empezamos siendo una gran tienda. Empezamos siendo amigos con un sueño, y cada paso nos acerca más a convertirlo en realidad.",
  /** El camino recorrido, resumido del mismo texto. */
  milestones: [
    {
      title: "Un sueño compartido",
      text: "Amigos con la misma pasión por el hardware y la tecnología, y ganas de hacer algo propio.",
    },
    {
      title: "Venta a venta",
      text: "Empezamos de manera informal, aprendiendo en cada operación y conociendo a nuestros clientes.",
    },
    {
      title: "Nuestra propia tienda",
      text: "Tecnología, buenos precios y confianza reunidos en una misma experiencia.",
    },
  ],
} as const;
