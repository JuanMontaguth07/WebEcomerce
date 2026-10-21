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
