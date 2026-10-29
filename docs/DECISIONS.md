# Decisiones técnicas

Registro breve de decisiones con su motivo. Las nuevas se agregan al final.

## D1 — Versiones fijadas y estabilidad mínima (2026-10-21)

Dependencias con versión exacta (`.npmrc: save-exact`) y publicadas hace al menos dos semanas.

- **Next.js 16.3.8** en lugar de 16.4.x: la 16.4 tenía menos de dos semanas y dos parches.
- **React 19.2.8**: la combinación con la que se publicó Next 16.3.8.
- **TypeScript 5.9**: TypeScript 7 (compilador nativo) aún no es compatible de forma fiable con
  typescript-eslint y el chequeo de tipos de Next.
- **ESLint 9.39**: los plugins de `eslint-config-next` (react, import, jsx-a11y) no declaran
  soporte para ESLint 10. Revisar al actualizar Next.

## D2 — Cache Components y rutas tipadas (2026-10-21)

`cacheComponents: true` hace que todo sea dinámico salvo lo marcado con `'use cache'`, lo que
vuelve explícita la caché del catálogo y su invalidación con `cacheTag`/`revalidateTag`.
`typedRoutes: true` hace que un enlace a una ruta inexistente no compile.

## D3 — Pedidos e inventario dentro de PostgreSQL (2026-10-21)

`create_order` es una función `security definer` que recibe solo IDs y cantidades, bloquea las
filas de producto (`FOR UPDATE`, orden por ID para evitar interbloqueos), recalcula precios y
descuenta stock en la misma transacción. Así no hay sobreventa ni precios manipulados, sin
depender de la secret key en la aplicación.

Se concede a `anon`: llamarla directamente con la publishable key no permite nada que la Server
Action no permita, porque toda la validación vive en la base de datos. La Server Action añade
validación de formulario, honeypot y límite por IP.

**Stock al crear el pedido:** se descuenta al crear (estado `pending`) y se devuelve al cancelar o
al vencer (48 h). Alternativa descartada: descontar al confirmar, que permite vender unidades
inexistentes.

## D4 — Sin service_role en la aplicación (2026-10-21)

Las operaciones de admin usan la sesión del administrador + RLS + funciones que verifican
`is_admin()`. Un fallo en una Server Action no puede saltarse RLS.

## D5 — Dinero en bigint y rutas de Storage (2026-10-21)

COP no usa decimales en la práctica: `bigint` evita errores de coma flotante. Las imágenes se
guardan como ruta dentro del bucket (`storage_path`), no como URL absoluta, para poder cambiar
de proyecto o dominio sin migrar datos.

## D6 — Especificaciones tipadas por categoría (2026-10-21)

`spec_definitions` + `product_specs` en lugar de un `jsonb` libre: permite filtrar por
especificación con índices, generar el formulario del admin por categoría y, más adelante,
calcular compatibilidad en el configurador (socket, TDP, factor de forma).

## D7 — Búsqueda con PostgreSQL (2026-10-21)

Full-text en español con `unaccent` (vector ponderado: nombre y SKU > marca y categoría >
resumen) más `pg_trgm` para errores de escritura y SKU parcial. Suficiente para miles de
productos sin un servicio externo. El operador `%` de trigramas vive en el esquema `extensions`
y debe calificarse en funciones con `search_path = ''`.

## D8 — Pruebas de base de datos con PGlite (2026-10-21)

No hay Docker en el equipo de desarrollo. `tests/db` levanta PostgreSQL en memoria (PGlite),
simula los roles y esquemas de Supabase y aplica las migraciones reales. Corre en segundos,
también en CI. No reemplaza una verificación final en el proyecto `dev`.

## D9 — Proxy solo en rutas con sesión (2026-10-21)

El checkout es como invitado, así que el catálogo no necesita sesión. `proxy.ts` solo corre en
`/admin/*` e `/ingresar`, lo que evita latencia en las páginas públicas. La autorización real se
repite en el layout del panel y en cada Server Action.

## D10 — Sistema de diseño (2026-10-21)

- **shadcn/ui sobre Radix** (`radix-ui` 1.7): componentes copiados al repo en
  `src/components/ui`, con la accesibilidad de Radix (teclado, foco, ARIA). La CLI `shadcn`
  queda como dependencia de desarrollo: solo aporta `shadcn/tailwind.css` (variantes
  `data-open`, `data-closed`, etc.) al compilar.
- **`cn` con `clsx` + `tailwind-merge`** en lugar del paquete `cn` que instala shadcn 4.22:
  ese paquete tenía un mes de vida y versión 0.x.
- **Tokens en `globals.css`**: variables CSS semánticas (nombres compatibles con shadcn) en
  OKLCH, redefinidas por `.dark`. Contrastes verificados: texto ≥ 4.5:1 y bordes de campos
  ≥ 3:1 en ambos temas.
- **next-themes** con `attribute="class"`: inyecta el tema antes de pintar (sin parpadeo) y
  guarda la preferencia en `localStorage` (`theme`).
- **Motion 13.5** en lugar de 14: la versión 14 tenía menos de tres semanas y varios parches
  en días. Se carga con `LazyMotion` de forma diferida; los componentes usan `m.*`, no
  `motion.*` (el modo `strict` lo exige). `MotionConfig reducedMotion="user"`.
- **Fuentes con `next/font`** (Archivo con eje de ancho, Hanken Grotesk, JetBrains Mono):
  alojadas en el mismo dominio y con métricas de respaldo, sin saltos de diseño.
- **`/sistema-diseno`**: página interna de referencia visual; responde 404 en producción.

## D11 — Catálogo público (2026-10-21)

- **Búsqueda y filtros en PostgreSQL** (`catalog_matches`, `catalog_search`, `catalog_facets`,
  `search_suggestions`): una sola consulta resuelve texto, categoría con subcategorías, marcas,
  precio, disponibilidad, orden y paginación, respetando RLS (`security invoker`).
- **Estado en la URL** con nombres en español (`?marca=kairos&disponible=1&orden=price_asc`):
  cualquier vista se puede compartir. Los parámetros se validan con Zod; lo inválido se ignora.
- **SEO de listados**: la URL canónica es la página limpia; las combinaciones de filtros y la
  búsqueda llevan `noindex, follow` para evitar contenido duplicado.
- **Filtros optimistas** (`useOptimistic`): los controles cambian al instante mientras llegan
  los resultados; si la navegación falla, vuelven al estado de la URL.
- **Más vendidos** solo con ventas reales (`best_selling_products`); sin pedidos, la sección no
  se muestra.
- **Sin fotos de productos reales**: mientras un producto no tenga imágenes se muestra una
  ilustración técnica de su categoría.
- **Datos de demostración** en `supabase/seed.sql` (marcas y modelos ficticios, SKU `DEMO-`,
  etiqueta "Demo" en la interfaz). Solo se cargan en `dev` y únicamente si no hay productos.
- **`partialPrefetching`**: las fichas no prerenderizadas se sirven al instante con su estructura
  y quedan en caché completas tras la primera visita.
- **`AppHref`** (`src/lib/routes.ts`): las rutas tipadas de Next solo validan literales en
  `<Link>`; este tipo permite pasar enlaces dinámicos como props sin perder la validación de los
  patrones existentes.
- **CI con datos reales**: el build lee el proyecto `dev` (valores públicos en variables de
  GitHub Actions).

## D12 — Autenticación y protección del panel (2026-10-21)

- **Tres capas**: `proxy.ts` (redirección optimista sin sesión) → `requireAdmin()` en el layout
  y en cada página del panel → `adminAction()` en cada Server Action. El rol se lee siempre de
  `profiles` en la base de datos, nunca de datos del cliente.
- **`getClaims()`** verifica la firma del JWT; `getSession()` no se usa en el servidor.
- **Registro público desactivado** también en el proyecto remoto (`supabase config push`,
  solo la sección `auth`) con `[auth] enable_signup = false`. **`[auth.email] enable_signup` debe
  quedar en `true`**: en la API de Supabase apaga todo el proveedor de correo, incluido el
  ingreso. Se conservaron la confirmación de correo y el TOTP del remoto, y se
  exige contraseña de 10+ caracteres con minúsculas, mayúsculas y números.
- **Errores de login genéricos** ("Correo o contraseña incorrectos") para no revelar qué
  correos existen; los límites de intentos los aplica Supabase Auth.
- **Redirección segura** tras el login: `safeNextPath()` solo acepta rutas de `/admin`.
- **Sin `forbidden()`**: es experimental en Next 16.3; un usuario sin rol se envía a
  `/ingresar?error=sin-permiso`.
- **Errores**: `logError()` registra en el servidor solo los errores inesperados; el cliente
  recibe mensajes en español sin detalles internos. Límites `error.tsx` en tienda y panel,
  `not-found.tsx` dentro de la tienda y `global-error.tsx` de respaldo.

## D13 — Carrito, checkout y pedidos (2026-10-21)

- **Carrito en `localStorage`** (`features/cart/store.ts`, `useSyncExternalStore`): guarda solo
  IDs y cantidades, se sincroniza entre pestañas y descarta datos manipulados
  (`sanitizeCart`). Precios y stock se cotizan siempre en el servidor (`quoteCart`, sin caché).
- **Checkout como invitado** con validación compartida (`features/checkout/schemas.ts`) en el
  navegador y en el servidor. Correo y teléfono se normalizan antes de validar.
- **Pedido**: `placeOrder` solo envía contacto, IDs y cantidades a `create_order`; los totales
  los calcula la base. Si el stock cambió, el cliente ve qué ajustar sin perder sus datos.
- **Anti‑abuso**: campo trampa (honeypot) y límite de 5 pedidos por correo cada 15 minutos en la
  base. Pendiente evaluar Turnstile si aparece spam (un límite por IP en la app no sirve en
  serverless y `create_order` también es accesible por la API).
- **Confirmación** en `/pedido/[id]?t=<token>`: token de 256 bits (la base guarda su hash),
  `noindex` y `referrer: no-referrer`.
- **Envío "por confirmar"**: `calculate_shipping_cost` devuelve NULL hasta que el negocio defina
  la política; la interfaz lo explica en carrito, checkout y confirmación.
- **Caché de stock en "minutes"**: los pedidos vencidos se cancelan en la base (pg_cron) sin poder
  invalidar la caché de Next; fichas, home y relacionados se refrescan en minutos.
- **Reintento en lecturas**: `createPublicClient({ retry: true })` reintenta una vez ante 5xx o
  fallas de red de Supabase. La creación de pedidos no reintenta para no duplicarlos.
- **Páginas legales en borrador** (términos, privacidad, garantías, retracto) con la estructura
  de la Ley 1581 de 2012 y la Ley 1480 de 2011, y marcadores para los datos del negocio.

## D14 — Panel de administración (2026-10-21)

- **Secciones**: Resumen, Pedidos, Productos, Inventario, Categorías (con su ficha técnica) y
  Marcas. Todas las páginas llaman `requireAdmin()` y todas las acciones usan `adminAction()`.
- **Pedidos**: los botones muestran solo las transiciones válidas (`ORDER_TRANSITIONS`, que una
  prueba compara con `private.order_transition_allowed`). Cancelar pide confirmación, devuelve
  el stock en la base y refresca la caché de las fichas afectadas.
- **Operaciones atómicas** en PostgreSQL: `reorder_product_images` y `set_product_specs`.
- **Imágenes**: se suben desde el navegador con la sesión del admin directamente a Storage
  (`products/<id>/<uuid>.<ext>`); la acción del servidor valida que la ruta pertenezca al
  producto antes de registrarla. Storage limita tamaño (5 MB) y tipos.
- **Storage necesita SELECT para borrar**: sin la política `catalog_admin_select`, `remove()` no
  fallaba pero dejaba archivos huérfanos. Los visitantes siguen sin poder listar el bucket.
- **Borrado seguro**: productos, categorías y marcas con dependencias no se eliminan (la base lo
  impide con claves foráneas) y la interfaz sugiere desactivarlos.
- **Recuperación de contraseña**: `resetPasswordForEmail` → `/auth/callback` (canje PKCE del
  código) → `/ingresar/nueva-clave`. Respuesta genérica para no revelar correos. El SMTP
  incluido en Supabase solo envía a miembros del equipo y con límites: en producción hay que
  configurar un SMTP propio.

## D15 — SEO y rendimiento (2026-10-26)

- **Indexación**: solo `VERCEL_ENV=production` se indexa (`allowIndexing` en `src/lib/seo.ts`,
  compartido por el layout y `robots.ts`). Fuera de producción, `robots.txt` bloquea todo.
- **robots.txt** excluye panel, sesión, carrito, checkout, pedidos y búsqueda. Los listados con
  filtros sí se rastrean pero llevan `noindex, follow` y canónica a la página limpia.
- **sitemap.xml**: páginas fijas, categorías, marcas y productos activos (con `lastModified`).
  Comparte la caché del catálogo, así que refleja los cambios del panel.
- **JSON-LD** solo con datos reales: `Product` + `Offer` (precio en COP y disponibilidad desde el
  stock), `BreadcrumbList` (lo emite el componente de migas) y `Organization`/`WebSite` en el
  inicio. No se publican calificaciones, condición, envíos ni devoluciones hasta que el negocio
  los defina. El contenido se escapa (`<` → `\u003c`).
- **Open Graph**: Next reemplaza `openGraph` completo cuando una página define el suyo; las
  páginas extienden `baseOpenGraph`, que trae la imagen por defecto generada en el build
  (`app/opengraph-image.tsx`). Los productos con foto usan la suya.
- **Metadatos en streaming**: en listados que leen `searchParams`, Next envía descripción y
  canónica al final del HTML para navegadores y Googlebot (que ejecuta JavaScript). Los bots que
  no ejecutan JavaScript (Bing, WhatsApp, Facebook, X) las reciben en el `<head>`. Verificado.
- **404 en rutas dinámicas**: con prerenderizado parcial, un slug inexistente responde 200 con la
  página "no encontrado" y `noindex` (comportamiento de Next con streaming). Google lo trata
  como no indexable.
- **Fuente de titulares con `display: optional`**: Archivo expandida es más ancha que el
  respaldo; con `swap`, al llegar tarde en móvil ensanchaba el h1 y movía el LCP de ~1 s a
  ~4,4 s. Con `optional` se usa si llega en ~100 ms (o desde caché en la siguiente visita).
- **Sin zod en el navegador fuera del checkout**: `lib/env.ts` y `features/catalog/params.ts`
  validan a mano porque llegan a todas las páginas (~70 KB comprimidos menos). El checkout sí
  valida en el navegador con el mismo esquema del servidor.

## D16 — Preparación para producción (2026-10-26)

- **Catálogo vacío en producción**: el seed es solo de demostración y nunca se aplica allí. Con
  Cache Components, `generateStaticParams` vacío rompe el build; `slugParams()` devuelve un slug
  de relleno que la página resuelve con "no encontrado".
- **Sin enlaces a categorías fijas**: "Ver computadores" sale de la categoría de los equipos
  armados que existan; si no hay ninguno, no se muestra.
- **Argumentos de funciones cacheadas**: son la clave de la caché. Se pasan valores simples
  (`getRelatedProducts(id, categorySlug)`) y solo los campos usados (`getCatalogFacets`); las
  listas se ordenan con desempate. Un objeto con orden variable provocaba "Unexpected cache
  miss" al regenerar páginas en paralelo.
- **CSP mínima** (`frame-ancestors`, `object-src`, `base-uri`, `form-action`). No se restringen
  scripts: exigiría nonces por petición y desactivaría el prerenderizado.
- **Pruebas de extremo a extremo** (`e2e/`, Playwright): solo lectura, así que pueden correr
  contra producción con `E2E_BASE_URL`. Fallan ante cualquier error de JavaScript o de consola.
  Corren en CI después del build.
- **Supabase producción** se administra con `--project-ref` (migraciones y configuración) sin
  cambiar el proyecto vinculado, que sigue siendo desarrollo.

## D17 — Identidad Kova Studio (2026-10-26)

- **Nombre**: Kova Studio (`siteConfig.name`); el logotipo provisional es un monograma "K" en rojo.
- **Paleta**: carbón cálido y un único acento rojo. Claro: `#D61F2C` con texto blanco (5.1:1).
  Oscuro: `#F0384A` con texto casi negro (5.0:1), porque en fondo oscuro ningún rojo cumple a la
  vez con texto blanco encima y como color de texto. `primary-soft` se aclaró/oscureció para que el
  texto rojo encima pase 4.5:1. Verificado con axe en ambos temas.
- **Todo sigue el tema**: se probó dejar hero y pie oscuros en ambos temas, pero en modo claro se
  percibían como errores ("no cambian"). Ahora cada sección cambia con el tema; el rojo de marca
  se mantiene con resplandores y el recuadro rojo sólido de `/nosotros`.
- **Transición de tema** con View Transitions (círculo difuminado desde la esquina superior
  izquierda). El cambio se aplica con `flushSync` dentro del callback para que la API capture el
  antes y el después; sin soporte o con movimiento reducido es inmediato.
- **Sobre nosotros**: sección en la portada (después del hero) y página `/nosotros` con el texto
  del negocio, en un solo módulo de contenido.

## D18 — Envíos, soporte y configuración de la tienda (2026-10-26)

- **Configuración en la base** (`store_settings`, una fila): WhatsApp, correo, horario y datos
  legales del vendedor (Ley 1480). La edita el admin en `/admin/configuracion`; no se guardan
  datos personales en el repositorio. Lo que esté vacío no se muestra (sin botones muertos) y los
  textos legales muestran el marcador entre corchetes hasta completarlo.
- **Envíos por departamento con excepciones por ciudad** (`shipping_rates`). La ciudad se compara
  sin tildes ni mayúsculas (`normalize_place`). Sin tarifa el envío queda "por confirmar", como
  antes. `create_order` sigue calculando el valor en la base; el checkout solo lo muestra.
- **Sin caché de datos de Next para Supabase** (`cache: "no-store"` en el cliente público): Next
  guardaba las respuestas HTTP sin etiquetas y con vigencia propia (15 min), de modo que una
  edición del panel podía tardar en verse aunque `updateTag` invalidara `'use cache'`.
- **Configuración resiliente**: si la lectura pública falla, la tienda sigue sin esos datos (no se
  cachea el fallo). El panel lee sin caché y muestra el error en vez de un formulario vacío que
  borraría los datos al guardar.

## D19 — Pago manual por Nequi (2026-10-26)

- Sin pasarela por ahora: el cliente transfiere a Nequi y el admin confirma el pedido en el panel.
- El número y el titular se configuran en el panel (`store_settings.nequi_number/holder`). La
  página del pedido pendiente muestra el valor, el número con botón de copiar, el botón para enviar
  el comprobante por WhatsApp y el plazo real de la reserva (`expires_at`, 48 horas).
- Si el envío está "por confirmar", el botón pide primero el valor del envío en lugar de enviar un
  comprobante por un monto incompleto.
- Términos y Soporte describen este medio de pago y el plazo solo cuando hay un Nequi configurado.

## D20 — Historial general y productos eliminables (2026-10-27)

- **`audit_log` inmutable**: triggers en catálogo, envíos y configuración, más el historial de
  estados de pedidos y los movimientos manuales de inventario, escriben quién hizo qué, cuándo, los
  campos que cambiaron (antes → después) y el motivo. Nadie lo edita ni lo borra (ni el admin); se
  ve en `/admin/actividad` y en cada producto y pedido. Las columnas técnicas (fechas, vector de
  búsqueda, stock, posición) no generan entradas: el stock ya tiene su propio historial.
- **Los productos con historial se pueden eliminar** (antes solo se ocultaban). Las líneas de
  pedido y los movimientos guardan nombre y SKU y quedan con `product_id` NULL; el borrado deja el
  stock en cero con un movimiento y queda en el historial con una copia de los datos y el motivo.
  Se rechaza si el producto está en un pedido sin cerrar (pendiente, confirmado, en preparación o
  enviado), porque ese pedido todavía puede devolver unidades.
- **Envío por confirmar**: el admin fija el valor en el pedido (`set_order_shipping`) y el
  cliente ve el total nuevo en la página de su pedido antes de pagar.
- **Exportaciones CSV** (pedidos, productos, inventario, actividad) con punto y coma y BOM para
  Excel en español; los textos que empiezan con `= + - @` se neutralizan para que no se ejecuten
  como fórmulas.

## D21 — Rarezas, anuncio y paleta de comandos (2026-10-28)

- **Rarezas** (`rarities`): niveles que el admin crea con nombre, color, efecto (sin efecto,
  resplandor, latido, destello u holográfico), nivel (0–100, mayor = más rara) y si salen en la
  portada. Cada producto puede tener una; se asigna en el formulario o en lote. Se ven en las
  tarjetas, en la ficha, en un bloque de la portada y en `/rarezas`.
- **El color del admin nunca pinta texto**: solo bordes, halos, fondos tenues e íconos, y el texto
  usa los tokens normales. Así cualquier color elegido se lee en modo claro y oscuro. Los efectos
  son CSS y se apagan con «movimiento reducido».
- **Barra de anuncio** en la configuración (texto, enlace y encendido). El enlace solo puede ser
  una ruta de la tienda: se rechazan rutas que empiezan con dos barras (normales o invertidas),
  que los navegadores abren como sitios externos.
- **Panel**: menú agrupado (Ventas, Catálogo, Tienda) y paleta de comandos (Ctrl+K) para ir a
  cualquier sección o abrir un producto o pedido por nombre, SKU o número.

## D22 — Rarezas como calidad y etiquetas de marca (2026-10-29)

- **Las rarezas describen calidad y precio**, no escasez: Común (económico), Poco común, Raro
  (calidad a precio competente), Épico (buenísimo y caro, pero lo vale), Ultra raro (súper bueno y
  más caro) y Legendario (tope de gama). Se ven solo en las tarjetas y la ficha; se quitaron el
  bloque de la portada, la página `/rarezas` y el enlace del menú.
- **Etiquetas de bandera** (`product_flags`): cinta pegada al borde de la tarjeta con el color y
  el logo de la marca o línea (NVIDIA GeForce, AMD Ryzen, Intel Core…). Se asigna por producto, en
  el formulario o en lote. El texto es blanco o casi negro según el contraste con el color elegido
  y el panel avisa si el color deja el nombre poco legible.
- **Logos de marcas**: el proyecto no incluye logos de terceros; el admin sube los suyos (PNG,
  WebP, JPG o AVIF de hasta 500 KB, nunca SVG) en `flags/` del bucket del catálogo. Al cambiar o
  borrar una etiqueta se elimina el archivo anterior.

## D23 — Anuncios de la portada y piezas únicas (2026-10-30)

- **Anuncios propios** (`home_banners`) entre las secciones de la portada para separarlas: uno
  después de cada dos secciones con productos, alternando el lado de la imagen; los que sobran van
  al final y, sin catálogo, la portada muestra solo los anuncios. Vienen dos, con los servicios
  que la tienda ofrece (armado de PC y asesoría), y se editan en `/admin/portada`.
- La imagen subida se difumina hacia el texto con una máscara; sin imagen se usa una ilustración
  incluida en línea técnica que sigue el tema. Al entrar en pantalla el anuncio pasa de desenfocado
  a nítido con animación por scroll (sin JavaScript; se omite con movimiento reducido).
- **Piezas únicas**: `products.unique_note` dice por qué un producto es especial. Los que la tienen
  salen en «Piezas únicas» de la portada con ese texto y en un recuadro de su ficha.

## D24 — Mi cuenta, preferencias del panel y efectos de borde (2026-10-27)

- **Mi cuenta** (`/admin/cuenta`): nombre, cambio de contraseña (pide la actual), modo claro u
  oscuro con interruptor, lista de administradores y cierre de sesión.
- **Preferencias por administrador** (`profiles.admin_accent`, `admin_font`): seis colores de
  acento con tonos propios para claro y oscuro (texto ≥ 4,5:1 medido) y tres fuentes (IBM Plex
  Sans por defecto, Figtree o Hanken Grotesk). Solo cambian la vista de quien las elige; las
  fuentes del panel se cargan únicamente en `/admin`.
- **Formularios**: los campos ya no se estiran cuando el vecino de fila es más alto
  (`content-start`) y al abrir un formulario el cursor queda en el primer campo.
- **Rarezas**: efectos «Circuito» (dos destellos recorren el borde; el pseudo-elemento solo pinta
  el borde) y «Sobrecarga» (el borde se enciende y se apaga). Al pasar el cursor la luz del borde se
  intensifica en todos los efectos.

## D25 — Módulo 1 del rediseño Neon Forge: sistema de diseño (2026-10-27)

- **Paleta Neon Forge**: carbón #101318 y grafito #1B222C de base, lima eléctrico #B8FF5C como
  color de marca y azul #55D6FF como reflejo escaso (`--tech`). En claro el lima no se lee como
  texto (1,1:1), así que `--primary` pasa a lima profundo #3D6B00 y el neón queda en `--lime`. El
  rojo se reserva para ofertas (`--sale`) y errores. Todos los pares de texto miden ≥ 4,5:1.
- **Modo oscuro por defecto** (`defaultTheme="dark"`); el visitante puede cambiarlo y se recuerda.
- **Fuentes**: Mona Sans para titulares (OFL, subconjunto latino de 98 KB alojado en
  `src/assets/fonts` con su licencia, `display: optional` para no afectar el LCP), Instrument Sans
  para texto e IBM Plex Mono para datos. Las variables pasan a nombres genéricos
  (`--font-display`, `--font-body`, `--font-data`). Hanken Grotesk queda solo como opción del panel.
- Logo, ícono, imagen para redes, manifest y página de error usan la paleta nueva.

## D26 — Módulo 2: encabezado, mega menú y menú móvil (2026-10-27)

- **Encabezado de una fila**: logo, «Categorías», buscador, Ofertas (en rojo de oferta), Nosotros
  (desde xl), Soporte, interruptor de tema y carrito. La barra de categorías que se desbordaba con
  scroll horizontal se reemplaza por el mega menú.
- **Mega menú** con `NavigationMenu` de Radix (ya instalado): categorías con su ilustración y
  subcategorías, accesos rápidos y marcas. Navegación por teclado, Esc y foco los da Radix. El panel
  va en el `Viewport`, posicionado respecto al encabezado: Radix envuelve la lista en un contenedor
  relativo y, sin Viewport, el panel quedaba del ancho del botón.
- **Estado activo** con subrayado lima. Leer la ruta (`usePathname`, `useSearchParams`) va dentro de
  `Suspense` con una versión sin estado activo de respaldo: con prerender parcial, leerla fuera de
  `Suspense` rompe el build de las rutas dinámicas y los enlaces deben estar en el HTML inicial.
- **Menú móvil**: accesos con ícono, categorías desplegables con sus subcategorías e interruptor de
  tema. La página de ingreso también usa el interruptor.
- El enlace «Arma tu PC» se agrega cuando exista Kova Architect (sin enlaces a páginas vacías).

## D27 — Módulo 3: hero asimétrico y categorías en bento (2026-10-27)

- **Hero asimétrico**: titular a la izquierda con «Explorar catálogo», «Ver ofertas» (solo si hay
  ofertas) y «Ver computadores», más el conteo real de productos y categorías. A la derecha, el
  equipo destacado con su foto (o la ilustración) y hasta 3 tarjetas flotantes con especificaciones
  de su ficha: GPU, CPU y consumo frente a la fuente; si falta alguna, RAM o almacenamiento.
- **Sin equipos publicados** (como producción hoy) el panel muestra el servicio «Armamos tu PC» con
  el mismo texto del anuncio de la tienda; las tarjetas flotantes pasan a ser decorativas, sin datos,
  y solo se ven en escritorio.
- **Paralaje con el cursor**: un componente cliente publica `--px`/`--py` y cada capa se desplaza
  según su `--depth` con la propiedad `translate`, para no chocar con los `transform` de Tailwind ni
  con la animación de entrada. Solo con cursor fino y sin movimiento reducido; nada se mueve en
  bucle. El titular no se anima porque es el LCP.
- **Bento de categorías**: tamaños según los productos visibles de cada categoría principal (suma
  sus subcategorías) con `category_product_counts()` (`security invoker`: cuenta lo que ve el
  visitante). La de más productos ocupa 2 × 2 y la siguiente 2 × 1; la celda «Ver todo» se estira
  para cerrar la última fila. La lógica está en `features/catalog/bento.ts` con pruebas.
- **Foto opcional por categoría** desde el panel (`categories.image_path`, que ya existía sin uso,
  ahora validada a `categories/<uuid>.<ext>`). Se borra del bucket al cambiarla, quitarla o eliminar
  la categoría. Sin foto se usa la ilustración.

## D28 — Estado «en línea» de los administradores (2026-10-27)

- **En vivo con Realtime Presence**, sin escribir en la base por cada cambio: cada pestaña del panel
  se anuncia en el canal privado `admin-presence` con nombre, iniciales y estado. Las políticas sobre
  `realtime.messages` dejan escuchar y anunciarse solo a administradores; un visitante recibe
  «Unauthorized».
- **Estados**: «En línea» con la pestaña visible; «Ausente» si queda en segundo plano o pasan 5
  minutos sin teclado ni mouse. Con varias pestañas cuenta la más activa.
- **Dónde se ve**: punto de estado en el avatar propio, avatares de los otros admins conectados en el
  encabezado y, en Mi cuenta → Administradores, «En línea», «Ausente» o «Visto hace…».
- **Última vez visto** en `admin_last_seen` (tabla aparte para no tocar `profiles.updated_at`),
  escrita solo con `touch_admin_seen()` cada 2 minutos mientras la pestaña está activa.
- Realtime puede rechazar la primera conexión del día mientras crea su partición diaria
  (`MissingPartition`): el panel cierra el canal y reintenta a los 30 s.

## D29 — Módulo 4: tarjeta de producto premium (2026-10-27)

- **Especificaciones clave** en la tarjeta (hasta 3, 2 en móvil): el admin las elige por categoría
  con «Mostrar en la tarjeta» en la ficha técnica (`spec_definitions.show_on_card`). La base limita a
  3 por categoría (`CARD_SPECS_LIMIT`) y el panel deshabilita la casilla al llegar al tope. La
  migración y la semilla marcan las 3 primeras de cada ficha como punto de partida.
- **Texto corto**: «12 GB», «8 núcleos» (número sin unidad + etiqueta), la etiqueta sola si es «Sí»;
  un «No» se omite. El nombre completo va en `title` y para lectores de pantalla.
- **Garantía visible** con el mismo texto de la ficha (`formatWarranty` en `lib/format`).
- Garantía y especificaciones llegan con `withCardDetails()`: dos consultas por listado (no por
  producto), dentro de la misma caché de cada listado.
- **Efectos sin hidratar cada tarjeta**: `CardEffects` (uno por página) escucha el cursor y publica
  `--rx`/`--ry`/`--gx`/`--gy` en la tarjeta bajo el cursor para el giro 3D y el reflejo. Solo con
  mouse y sin movimiento reducido. La luz que recorre el borde corre solo mientras el cursor está
  encima, y no en las rarezas (ya tienen la suya).
- **Rarezas en pausa fuera de pantalla**: el mismo componente observa las `.rarity-card` (también las
  que llegan al filtrar o navegar) y les pone `data-offscreen`, que detiene sus animaciones.

## D30 — Módulo 5: secciones comerciales y microinteracciones (2026-10-27)

- **Selección Kova**: así se llama ahora la sección de destacados (la casilla «Destacado» del
  producto sigue igual).
- **Compra por marca**: franja con las marcas que tienen productos publicados (máximo 12, las de más
  productos primero), con el conteo de `catalog_facets`, sin consulta nueva. El logo lo sube el admin
  en la marca (`brands.logo_path`, que ya existía sin uso, ahora validada a `brands/<uuid>.<ext>`) y
  va sobre una placa clara para que cualquier logo se lea en ambos temas. Sin logo se muestra el
  nombre. No se incluyen logos de terceros en el proyecto.
- **Subida de imágenes del panel** unificada en `ImageUploadField` + `useImageUpload` (categorías y
  marcas): validación de tipo y peso, vista previa, subida al guardar y limpieza si el guardado falla.
- **Revelado al hacer scroll** (`.reveal`) en las secciones de la portada con `animation-timeline:
view()`: sin JavaScript, sin soporte o con movimiento reducido se ven de una.
- **Esqueletos con brillo** (`.skeleton-shimmer`) en lugar del parpadeo.
- **Reordenado animado** en el catálogo: `ReorderList` aplica FLIP con la Web Animations API; las
  tarjetas que siguen se deslizan a su lugar y las nuevas aparecen. Sin dependencias y sin animación
  con movimiento reducido.

## D31 — Kova Architect M6: motor de compatibilidad y plantilla (2026-10-27)

- **Motor** en `features/compatibility`: TypeScript puro, sin dependencias, compartido por navegador y
  servidor. Cada regla es una función pequeña que devuelve `null` si sus piezas no están elegidas.
  Estados: compatible, advertencia, incompatible y «no se puede confirmar» cuando falta un dato: el
  motor nunca adivina. Los resultados salen ordenados, lo más grave primero, y `partStatus` da el
  estado de cada pieza.
- **Reglas con datos**: socket CPU ↔ placa, tipo de memoria, módulos ↔ ranuras, formato de placa ↔
  gabinete, largo de la gráfica (advertencia con menos de 10 mm de margen), disipador (socket y
  capacidad térmica, holgada desde +20 % sobre el TDP), fuente (CPU + GPU + 75 W; error si no
  alcanza, advertencia con menos de 30 % de margen o por debajo de lo que pide la gráfica) y ranuras
  M.2.
- **Sin datos todavía**: altura del disipador, radiador y conectores de la fuente se marcan «no se
  puede confirmar». Altura y radiador se comprueban de verdad en cuanto la ficha tenga `height`,
  `max_cooler_height` y `radiator_support`.
- La ficha se lee de forma tolerante: «322 mm», «1.000 W», «2 × 16 GB», «Micro-ATX» = «mATX».
- **Plantilla en el panel**: en cada categoría, «Kova Architect» fija qué pieza representa
  (`categories.architect_part`; una subcategoría sin valor usa el de su principal) y agrega a la
  ficha las especificaciones de la plantilla que falten, sin cambiar las que hay. Las que usa el
  motor se marcan «Architect». Una prueba comprueba que la plantilla cubre todas las claves que leen
  las reglas.
- **Piezas demo en código** (`features/architect/demo-parts.ts`): ficticias, marcadas «demo», con
  precios de ejemplo y no comprables. Sirven para probar el motor y para que el configurador funcione
  aunque el catálogo no tenga productos con ficha.

## D32 — Kova Architect M7: modo libre y comparador (2026-10-27)

- **Ruta `/arma-tu-pc`** («Arma tu PC» en el encabezado, el mega menú y el menú móvil, y en el
  sitemap). La estructura se prerenderiza y las piezas llegan en `Suspense`.
- **Piezas del catálogo**: productos activos de las categorías con pieza de Architect (una
  subcategoría sin pieza propia usa la de su principal), con la ficha completa
  (`getArchitectParts`, caché por `products` y `categories`).
- **Catálogo o piezas demo**: un selector cambia entre ambos y reinicia el equipo. Si el catálogo
  no tiene piezas con ficha (como producción hoy), abre en demo. Las demo se muestran siempre
  marcadas, con «Precio de ejemplo», y no se pueden agregar al carrito.
- **Tres paneles**: piezas del equipo con su estado; opciones de la pieza activa con la
  compatibilidad que tendrían al elegirlas («Solo compatibles» oculta las que no encajan y dice
  cuántas); resumen con presupuesto opcional, total, consumo estimado y cada comprobación explicada.
- **Comparar dos opciones** del mismo tipo lado a lado, con la diferencia escrita («2 más»,
  «$ 720.000 menos»).
- **Agregar todo al carrito**: solo piezas reales con stock, sin pasar el stock de lo que ya está en
  el carrito; avisa si hay piezas incompatibles.
- **Celular y tablet**: las piezas son una fila deslizable y el resumen va en una barra fija que se
  abre como panel. El botón de WhatsApp sube para no taparla.
- Guardar, compartir y cotizar llegan en el M9: no hay botones que todavía no hagan nada.

## D33 — Presencia de los admins al estilo Discord (2026-10-27)

- **El equipo siempre a la vista**: en el encabezado del panel (también en el celular, donde antes
  no se mostraba) están los avatares de todos los administradores; al tocarlos se abre la lista con
  el estado de cada uno. Antes solo aparecían los que estaban conectados, y solo desde tablet.
- **Estados**: en línea (punto verde), ausente (luna ámbar: pestaña en segundo plano o 5 minutos
  sin actividad) y desconectado (aro gris, con «visto hace…»).
- **Dispositivo**: cada pestaña anuncia si es computador o celular (tabletas cuentan como celular;
  iPadOS se detecta por la pantalla táctil). Como en Discord, se muestra el ícono de celular solo si
  la persona no está activa en un computador.
- **Estado de la conexión** al pie de la lista («Conectado en tiempo real» o «Reintentando…»), y un
  aviso en la consola si Realtime rechaza el canal, para diagnosticar.
- `getAdminTeam()` arma la lista (perfil y última vez visto) para el panel y Mi cuenta.

## D34 — Kova Architect M8: modo guiado (2026-10-27)

- **Arma tu PC abre en modo guiado** («Guiado / Libre» arriba). Seis preguntas: uso, presupuesto
  (de $ 2 a $ 25 millones), resolución (solo si es para jugar), marca preferida, prioridad y si
  necesita monitor o periféricos (se aparta un 15 % o un 22 % del presupuesto).
- **Reparto del presupuesto** por uso (para jugar, la gráfica se lleva la mayor parte; para trabajar
  o estudiar, el procesador), ajustado por resolución y prioridad. Lo que una pieza no usa pasa a
  las siguientes y lo que se pasa se les descuenta.
- **Elección pieza por pieza** en un orden que respeta la compatibilidad (procesador, placa,
  memoria, gráfica, gabinete, refrigeración, almacenamiento y, al final, la fuente según el consumo
  estimado del equipo armado). Dentro de cada parte gana la opción compatible con mejores
  especificaciones; el precio desempata.
- **Sin gráfica dedicada** para trabajar o estudiar si el procesador trae gráficos integrados; su
  parte va al almacenamiento. Si el procesador no lo informa, se agrega una gráfica y se dice.
- **Honesto con el presupuesto**: si no alcanza ni con lo más económico que encaja, se usa eso y se
  dice cuánto cuesta. Si la marca preferida no tiene piezas que encajen, también se dice.
- **Cada pieza explica su porqué** con datos de la ficha («Se lleva el 34 % del presupuesto porque
  para jugar la gráfica es lo que más pesa. Tiene 12 GB de memoria de video…») y ofrece una
  alternativa más económica y otra mejor. No se prometen FPS: no hay datos que los respalden.
- «Ajustar en modo libre» abre el resultado en los tres paneles con el presupuesto de la torre.

## D35 — Kova Architect M9: guardar, compartir, cotizar e integrar (2026-10-27)

- **Guardar sin cuentas**: «Guardar y compartir» pide un nombre y crea un enlace propio
  (`/arma-tu-pc/<código>`, 12 caracteres al azar). Cada guardado es una fila nueva e inmutable en
  `builds` + `build_components`; guardar a partir de un enlace crea una versión nueva que apunta a
  la anterior (`parent_id`), así que el enlace original nunca cambia.
- **Precios desde la base**: `save_build()` toma nombre, SKU y precio de los productos (no del
  navegador) y exige que estén activos; las piezas demo se guardan con su id de código y precio de
  ejemplo. Freno básico: 60 guardados cada 10 minutos en toda la tienda. Nadie lee las tablas
  directamente: `get_build(código)` devuelve solo esa configuración; los admins pueden consultarlas.
- **Enlace guardado**: abre la configuración en el modo libre y avisa si alguna pieza ya no está en
  el catálogo o cambió de precio desde que se guardó. No se indexa en buscadores.
- **Mis configuraciones**: la lista de las guardadas desde este navegador (localStorage, hasta 30),
  dicho así en pantalla. Quitar una de la lista no borra su enlace.
- **Cotización por WhatsApp** al número de la tienda con cada pieza, su precio, el total y el
  enlace (solo si hay WhatsApp configurado en el panel). También «Compartir por WhatsApp» y copiar
  el enlace.
- **Entradas desde la tienda**: «Usar en Arma tu PC» en la ficha de los productos cuya categoría
  tiene pieza de Architect (`?pieza=` abre el modo libre con ese producto puesto) y «Arma tu PC con
  esta pieza» en esas categorías (`?tipo=`).
- Las pruebas de navegador no guardan configuraciones: también corren contra producción y dejarían
  filas de prueba (igual que con los pedidos).

## D36 — Filtros por especificación en el catálogo (2026-10-27)

- Las especificaciones marcadas **«Filtrable»** en la ficha de una categoría aparecen como filtros
  en esa categoría (y en sus subcategorías, por clave): memoria de video, socket, núcleos,
  capacidad… Cada valor muestra cuántos productos tiene.
- **Combinación**: dentro de una especificación se suman opciones («8 GB» o «12 GB»); entre
  especificaciones se cruzan («AM5» y «8 núcleos»). El conteo de cada especificación aplica los
  demás filtros pero no el suyo, para poder sumar opciones (igual que las marcas).
- **URL legible y segura**: `?f_vram=12&f_vram=16`. Parámetros repetidos (no listas con coma)
  para que un valor con coma no se rompa; claves validadas y tope de 8 especificaciones y 12
  valores. Como los demás filtros, esas combinaciones no se indexan.
- **En la base**: `spec_value_key()` normaliza el valor (números sin ceros sobrantes, booleanos,
  textos en minúsculas); `catalog_matches`, `catalog_search` y `catalog_facets` reciben `p_specs`
  y `catalog_spec_facets()` entrega los valores. Una especificación solo se muestra con al menos
  dos valores distintos (o si ya se está filtrando por ella).
- Sin categoría (todos los productos, búsqueda general) no hay filtros por especificación: las
  fichas cambian de una categoría a otra. Al cambiar de categoría, esos filtros no se llevan.

## D37 — Portada con más dinamismo (2026-10-27)

- **Problema**: cuatro secciones seguidas con el mismo título y la misma grilla de 4 tarjetas, todo
  estático salvo el hero y tarjetas casi iguales (sin fotos aún).
- **Cada colección con su forma** (`components/shop/home-collections.tsx`): Selección Kova con
  filtro por categoría (botones, sin recargar) y una pieza destacada en grande (`SpotlightCard`);
  Ofertas como carrusel deslizable (`ProductRail`) sobre una banda con tinte de oferta y el mayor
  descuento en el antetítulo; Computadores armados como vitrina (uno grande y el resto en lista);
  Más vendidos como ranking con números grandes; Recién agregados como fila de tarjetas compactas.
  En celular, las listas se deslizan de lado en lugar de apilarse.
- **Encabezados variados** (`SectionHeader`): numerados en el orden en que aparecen, con
  antetítulo y tres disposiciones (izquierda, en columnas y centrado).
- **Bandas** a lo ancho (`.band`) con luz en los bordes y un tinte por sección (`--band`).
- **Movimiento**: beneficios como cinta bajo el hero y marcas como marquesina (`Marquee`), que se
  pausan al pasar el cursor; tarjetas que entran escalonadas al bajar (`.stagger-in`, con
  animaciones por scroll). Con movimiento reducido todo queda quieto y la copia de la marquesina
  se oculta. La copia también queda fuera del teclado y de los lectores de pantalla (`inert`).
- **Tinte por categoría** (`categoryTint`): el fondo y el dibujo de cada tarjeta toman un tono
  según su categoría, derivado del slug, para que una grilla sin fotos no se vea uniforme.
- La columna de `<main>` en la portada es `minmax(0, 1fr)`: sin eso, el ancho de la marquesina
  ensanchaba toda la página.

## D38 — Alertas en tiempo real y chat entre admins (2026-10-28)

- **La base genera las alertas** (`admin_alerts`, triggers): pedido nuevo (al confirmar la
  transacción, con sus productos ya guardados), cambio de estado de un pedido (con el estado
  anterior; si venció solo, lo dice), stock que baja del mínimo y producto agotado, una vez por
  cruce. `actor_id` guarda quién lo causó: un admin no recibe alertas de lo que él mismo hizo. Se
  borran a los 60 días (pg_cron, si existe).
- **En el panel** (`components/admin/live`): notificaciones flotantes al estilo iOS (vidrio, ícono
  de color por tipo, pila que se despliega al pasar el cursor, se descartan deslizando, se van solas
  a los 7 s con pausa al pasar el cursor), campana con el historial por día, sonido opcional
  generado con Web Audio (preferencia en este navegador) y el número de pendientes en el título de
  la pestaña. Al reconectarse se piden las alertas que pudieron perderse.
- **Chat entre admins** (`admin_messages`): botón flotante con contador, ventana con burbujas
  agrupadas por autor y por día, «escribiendo…» (viaja en la presencia de cada admin), Enter para
  enviar y envío optimista. Solo se escribe como uno mismo y lo enviado no se edita.
- `admin_reads` guarda hasta cuándo leyó cada admin las alertas y el chat (`mark_admin_read`).
- Ambas tablas están en la publicación de Realtime; la RLS limita la lectura a administradores.

## D39 — Chat del equipo: visto, mensajes nuevos y colores (2026-10-28)

- **«Visto»** bajo el último mensaje propio («Visto», «Visto por Ana», «Visto por todos», con los
  avatares de quienes lo vieron). Sale de `admin_reads.chat_read_at` al cargar y, en vivo, de la
  presencia: cada admin anuncia la hora (de la base) del último mensaje que tuvo delante, sin
  migración ni tráfico extra en la base. Lo anunciado se conserva aunque el otro cierre la pestaña.
- **Mensajes nuevos**: al abrir el chat aparece un separador antes del primer mensaje sin leer y la
  lista arranca ahí. Si se está leyendo más arriba, lo que llega ya no arrastra hacia abajo: un
  botón «↓ N nuevos» lleva al final. Con el chat abierto en otra pestaña, lo nuevo se da por leído
  al volver.
- **Color de cada admin**: avatares y nombres usan el acento que cada uno eligió en «Mi cuenta»
  (mismos tonos probados en claro y oscuro), también en el panel «Equipo» del encabezado.
- Las horas se comparan por instante, no como texto: la base escribe «+00:00» y el navegador «Z».

## D40 — Chat del equipo: reacciones y respuestas citadas (2026-10-28)

- **Reacciones** (`admin_message_reactions`, migración `20261109120000_admin_chat_reactions`):
  👍 ❤️ 😂 👀 ✅ 🔥, una por admin, mensaje y emoji; cada uno pone y quita solo las suyas. Cada
  fila tiene su propio `id` porque Realtime no aplica la RLS a los DELETE y solo entrega la clave:
  así no deja ver de quién ni de qué mensaje era. Si alguien reacciona a un mensaje propio y el chat
  no está a la vista, llega un aviso flotante.
- **Responder citando** (`admin_messages.reply_to`): la cita va dentro de la burbuja con el nombre
  y el comienzo del original; al tocarla lleva al mensaje y lo resalta. Si el original ya no está
  cargado, dice «Respuesta a un mensaje anterior».
- **Acciones del mensaje**: barra con las reacciones y «Responder» al pasar el cursor; en pantallas
  táctiles al tocar el mensaje; con el teclado, Enter sobre el mensaje y Escape para salir. Escape
  en el campo de texto cancela la respuesta antes de cerrar el chat. Envío y reacciones optimistas.

## D41 — Chat del equipo conectado con la tienda (2026-10-28)

- **Pedidos con #**: escribir `#1042` lo vuelve enlace al pedido y añade una mini-tarjeta con
  estado, cliente y total (hasta dos por mensaje). No necesita columna: se lee del texto.
- **Productos compartidos** (`admin_messages.product_id`, migración
  `20261110120000_admin_chat_refs`): el botón del paquete busca por nombre o SKU y adjunta la
  tarjeta (foto, precio, SKU y stock con color). Un mensaje puede ir solo con el producto; eso se
  valida con un trigger al escribir, no con un check, para que borrar el producto (que deja
  `product_id` en null) no choque con el mensaje.
- **@menciones** (`admin_messages.mentions`): al escribir @ salen sugerencias (flechas, Enter o
  Tab, Escape); se menciona por el primer nombre o por el completo si dos lo comparten. La base
  solo acepta administradores y quita repetidos. A quien mencionan le llega un aviso rosado
  («Ana te mencionó») y el botón del chat muestra «@».
- **Comentar en el chat**: desde cada alerta de la campana, la página de un pedido o la de un
  producto; abre el chat con `#1042` escrito o el producto ya adjunto.
- Las tarjetas se piden desde el navegador (RLS de admin) y se guardan mientras dura la visita;
  cuando llega una alerta de ese pedido o producto, su tarjeta se vuelve a pedir.

## D42 — Chat del equipo: borrar, anteriores, celular, silencio y emojis (2026-10-28)

- **Borrar un mensaje propio** (`delete_admin_message`, migración
  `20261111120000_admin_chat_delete`): con dos toques en la papelera. La fila se queda (las
  respuestas la citan) con `deleted_at`, sin texto, producto, menciones ni reacciones; se ve
  «Mensaje eliminado» y llega a los demás por Realtime (UPDATE).
- **Mensajes anteriores**: «Ver mensajes anteriores» trae 50 más sin mover la vista.
- **Celular**: el chat ocupa toda la pantalla (respetando las zonas seguras) y el botón flotante
  se oculta mientras está abierto.
- **Silenciar el chat** (campana del encabezado, preferencia en este navegador): los mensajes
  dejan de avisar; las menciones siguen avisando.
- **Emojis** para el texto: 40 frecuentes, se insertan donde está el cursor.

## D43 — Rediseño visual del panel (2026-10-29)

- **Color por módulo** (`components/admin/module-tile.tsx`): cada sección tiene un ícono tipo
  app con su degradado (Pedidos verde, Productos azul, Inventario ámbar…), el mismo sistema que
  las alertas. Se ve en el menú, junto al título de cada página (`CurrentModuleTile`, sale de la
  ruta) y en el resumen. «Mi cuenta» usa el acento del admin.
- **Menú lateral contraíble** (`sidebar.tsx`): en pantallas grandes se reduce a solo íconos (con
  el nombre como ayuda al pasar el cursor y para lectores de pantalla). La preferencia va en la
  cookie `admin_sidebar`, que el layout lee para pintarlo igual desde el servidor (sin salto).
- **Marca de la sección activa** que se desliza hasta ella al navegar o al contraer el menú
  (medida en el navegador; Motion no trae aquí las animaciones de layout).
- **Transición entre páginas** (`app/admin/template.tsx`) y **bloques del resumen escalonados**
  (`.admin-rise`); con opacity/translate para no romper lo fijo dentro de la página, y sin
  movimiento si el sistema pide reducirlo.
- **Resumen** (`components/admin/dashboard-view.tsx`, la página solo consulta los datos):
  saludo según la hora de Colombia, cuántos temas hay por atender, accesos rápidos, cifras que
  suben (`CountUp`; los lectores de pantalla leen el valor final) y tendencia de 30 días en
  ventas y pedidos.
- De paso: el panel tiene región principal (`<main id="contenido">`, destino del «saltar al
  contenido»), en el celular ya no se desborda a lo ancho y el selector de tema se oculta en el
  encabezado del celular (está en «Mi cuenta»).
