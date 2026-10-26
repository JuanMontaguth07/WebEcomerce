# Arquitectura

Documento vivo. Las decisiones con sus alternativas están en [DECISIONS.md](DECISIONS.md).

## Principios

1. **Servidor por defecto.** Server Components renderizan catálogo, fichas y SEO. JavaScript de
   cliente solo donde hay interacción: carrito, filtros, galería, buscador y selector de tema.
2. **La base de datos es la autoridad.** Precios, stock y reglas de pedido se validan en
   PostgreSQL. El navegador solo envía identificadores y cantidades.
3. **Lógica separada de la UI.** `src/features/<dominio>` contiene consultas, acciones, esquemas y
   tipos; `src/components` solo presenta.
4. **Seguridad en capas.** Validación con Zod en el servidor → RLS → restricciones y funciones en
   PostgreSQL.

## Capas

```
Navegador ──► Server Components (lectura) ──► features/*/queries.ts ──► Supabase (RLS)
          └─► Server Actions (escritura)  ──► features/*/actions.ts ──► RPC PostgreSQL
```

| Capa            | Ubicación                | Responsabilidad                                      |
| --------------- | ------------------------ | ---------------------------------------------------- |
| Rutas           | `src/app`                | Composición de páginas, metadata, límites de error   |
| Componentes     | `src/components`         | Presentación; sin acceso a datos                     |
| Dominio         | `src/features/<dominio>` | `queries.ts`, `actions.ts`, `schemas.ts`, `types.ts` |
| Infraestructura | `src/lib`                | Entorno, errores, formato, clientes Supabase         |
| Datos           | `supabase/migrations`    | Esquema, RLS, funciones transaccionales              |

### Clientes de Supabase

| Cliente                   | Archivo                  | Uso                                          |
| ------------------------- | ------------------------ | -------------------------------------------- |
| `createPublicClient()`    | `lib/supabase/public.ts` | Catálogo público, cacheable (`'use cache'`)  |
| `createClient()` servidor | `lib/supabase/server.ts` | Panel y acciones con la sesión del usuario   |
| `createClient()` browser  | `lib/supabase/client.ts` | Inicio de sesión del panel                   |
| `updateSession()`         | `lib/supabase/proxy.ts`  | Refresco de sesión en `/admin` e `/ingresar` |

La aplicación **no usa la secret key (service_role)**. Las operaciones privilegiadas son funciones
`security definer` que verifican el rol internamente.

## Sistema de diseño

- Tokens: `src/app/globals.css` (`:root` = claro, `.dark` = oscuro). Los componentes solo usan
  clases semánticas (`bg-card`, `text-muted-foreground`, `border-input`, `text-success`...).
- Componentes base: `src/components/ui` (shadcn/Radix adaptados). `Field` conecta etiqueta,
  ayuda y error con `aria-describedby` / `aria-invalid`.
- Tema: `next-themes` (claro / oscuro / sistema) en `components/providers/providers.tsx`;
  selector en `components/layout/theme-toggle.tsx`.
- Movimiento: `m.*` de `motion/react` dentro de `LazyMotion`; `Reveal` para apariciones al
  hacer scroll (nunca en contenido visible al cargar). Notificaciones con `toast` de `sonner`.
- Utilidades propias: `container-page` (ancho y márgenes) y `text-eyebrow` (etiquetas técnicas).
- Todo sigue el tema elegido: no hay secciones con colores fijos. El rojo de marca se refuerza
  con resplandores (`bg-primary/…`) y la sombra `shadow-glow`.
- Marca: `Logo`/`LogoMark` en `components/layout/logo.tsx` (el nombre sale de `siteConfig`).
  La historia de `/nosotros` y de la portada vive en `src/content/nosotros.ts`.
- Referencia visual: `/sistema-diseno` (solo fuera de producción).

## Autenticación del panel

| Capa             | Archivo                                       | Qué verifica                                                                |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Proxy            | `src/proxy.ts`                                | Que exista una sesión válida en `/admin/*` (si no, redirige a `/ingresar`). |
| Layout y páginas | `features/auth/session.ts` → `requireAdmin()` | Sesión verificada (`getClaims`) y rol `admin` en `profiles`.                |
| Server Actions   | `lib/admin-action.ts` → `adminAction()`       | Rol `admin`, validación Zod, resultado tipado sin detalles internos.        |
| Base de datos    | RLS + funciones `security definer`            | `is_admin()` en cada política y operación sensible.                         |

Las acciones del panel invalidan la caché del catálogo con `revalidateCatalog()`
(`features/catalog/revalidate.ts`).

## Flujo de compra

```
Ficha / tarjeta ──► carrito (localStorage: IDs + cantidades)
                       │
                       ├─► quoteCart() ──► precios y stock actuales (sin caché)
                       ▼
                 /checkout ──► placeOrder() ──► create_order() en PostgreSQL
                                                 (precios de la base, stock reservado)
                       ▼
          /pedido/[id]?t=<token> ──► get_order_by_token()
```

## Panel de administración

| Ruta                   | Qué permite                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `/admin`               | Indicadores, últimos pedidos y productos por reponer                                   |
| `/admin/pedidos`       | Filtrar por estado, buscar, ver detalle, cambiar estado, contactar por WhatsApp/correo |
| `/admin/productos`     | Crear, editar, ocultar, eliminar; imágenes, ficha técnica e inventario por producto    |
| `/admin/inventario`    | Historial de movimientos filtrable por tipo y producto                                 |
| `/admin/categorias`    | Jerarquía, SEO y definición de especificaciones por categoría                          |
| `/admin/marcas`        | Crear, editar, eliminar                                                                |
| `/admin/envios`        | Tarifas por departamento y excepciones por ciudad, con días de entrega                 |
| `/admin/configuracion` | WhatsApp, correo, horario y datos legales del vendedor                                 |
| `/ingresar/recuperar`  | Restablecer contraseña por correo                                                      |

## SEO

| Pieza                    | Dónde                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| Indexación por entorno   | `allowIndexing` en `src/lib/seo.ts` (solo producción en Vercel)      |
| robots.txt / sitemap.xml | `src/app/robots.ts`, `src/app/sitemap.ts`                            |
| JSON-LD                  | `src/features/catalog/structured-data.ts` + `<JsonLd>`               |
| Open Graph               | `baseOpenGraph` + `src/app/opengraph-image.tsx` (imagen por defecto) |
| Canónicas de listados    | `listingMetadata` en `src/features/catalog/seo.ts`                   |

## Caché

`cacheComponents` está activo. Las consultas del catálogo usan `'use cache'` con `cacheTag`
(`products`, `product:<slug>`, `categories`, `brands`). Cada Server Action del panel que modifica
datos llama `updateTag` con las etiquetas afectadas. El stock visible en una ficha cacheada
puede tener segundos de retraso; la verificación definitiva ocurre en `create_order`.

## Modelo de datos

Dinero en pesos colombianos como `bigint` (sin decimales). Imágenes como rutas dentro del bucket
`catalog` de Supabase Storage.

```
categories ─┬─< products >─── brands
            │      │
            │      ├─< product_images
            │      ├─< product_specs >── spec_definitions >── categories
            │      ├─< inventory_movements
            │      └─< order_items >── orders ─┬─< order_status_history
            │                                  └─< payments
profiles (1:1 auth.users) ── orders.user_id (opcional)
```

| Tabla                  | Notas                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| `profiles`             | Rol `customer`/`admin`. El rol solo cambia por SQL.                     |
| `categories`           | Jerárquica (`parent_id`), campos SEO propios.                           |
| `brands`               | Nombre y slug únicos.                                                   |
| `products`             | `stock` no editable por la API; `search_vector` mantenido por triggers. |
| `product_images`       | Posición única por producto (diferible para reordenar).                 |
| `spec_definitions`     | Especificaciones tipadas por categoría (`text`/`number`/`boolean`).     |
| `product_specs`        | Valor por producto; un trigger valida categoría y tipo.                 |
| `orders`               | Snapshot del cliente, totales, token de consulta (hash), vencimiento.   |
| `order_items`          | Snapshot de nombre, SKU y precio unitario.                              |
| `order_status_history` | Quién cambió qué estado y cuándo.                                       |
| `inventory_movements`  | Solo inserción; `resulting_stock = previous_stock + quantity`.          |
| `payments`             | Vacía en el MVP; la llenarán los adaptadores de pasarela.               |

### Funciones del catálogo (RPC, `security invoker`)

| Función                    | Uso                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog_search(...)`      | Listado paginado con texto, categoría (incluye subcategorías), marcas, precio, disponibilidad, ofertas y orden. Devuelve `total_count`. |
| `catalog_facets(...)`      | Marcas con conteo y rango de precios para los filtros.                                                                                  |
| `search_suggestions(q)`    | Sugerencias del buscador por prefijo, SKU y similitud; incluye categorías y marcas.                                                     |
| `best_selling_products(n)` | Más vendidos (90 días). `security definer`: solo expone IDs y unidades.                                                                 |

### Funciones de negocio (RPC)

| Función                                    | Quién       | Qué hace                                                                                                              |
| ------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `create_order(customer, items)`            | anon / auth | Valida, bloquea filas, recalcula precios, descuenta stock, registra movimientos e historial. Devuelve número y token. |
| `get_order_by_token(id, token)`            | anon / auth | Confirmación de pedido sin cuenta.                                                                                    |
| `calculate_shipping_cost(...)`             | anon / auth | Política de envío (hoy: `NULL` = por confirmar).                                                                      |
| `adjust_stock(product, qty, type, reason)` | admin       | Ajuste manual con movimiento trazable.                                                                                |
| `update_order_status(order, status, note)` | admin       | Máquina de estados; cancelar devuelve stock.                                                                          |
| `expire_pending_orders()`                  | pg_cron     | Cancela pendientes vencidos (48 h) cada 15 min.                                                                       |

Estados del pedido:

```
pending ─► confirmed ─► preparing ─► shipped ─► delivered
   │           │            │
   └───────────┴────────────┴──► cancelled   (devuelve stock)
```

### Seguridad (RLS)

- `anon`/`authenticated`: lectura de catálogo **activo**. Sin escritura.
- `admin`: escritura de catálogo (excepto `stock`), lectura de pedidos, inventario y pagos.
- Pedidos, ítems, movimientos y pagos: sin `INSERT/UPDATE/DELETE` para roles de la API.
- `TRUNCATE` retirado a los roles de la API (no respeta RLS).
- Storage `catalog`: lectura pública, escritura solo admin, máx. 5 MB, JPEG/PNG/WebP/AVIF.
- `EXECUTE` de funciones retirado explícitamente a `anon` (Supabase lo concede por defecto).

Las pruebas en `tests/db` verifican estas reglas aplicando las migraciones reales.

## Rutas previstas (español, para SEO en Colombia)

| Ruta                                                  | Contenido                            | Fase |
| ----------------------------------------------------- | ------------------------------------ | ---- |
| `/`                                                   | Home                                 | 3    |
| `/productos`                                          | Catálogo con filtros en query string | 3    |
| `/productos/[slug]`                                   | Ficha de producto                    | 3    |
| `/categorias/[slug]`                                  | Landing indexable por categoría      | 3    |
| `/marcas/[slug]`                                      | Landing por marca                    | 3    |
| `/buscar?q=`                                          | Resultados de búsqueda (noindex)     | 3    |
| `/carrito`, `/checkout`                               | Compra                               | 5    |
| `/pedido/[id]?t=`                                     | Confirmación con token               | 5    |
| `/ingresar`                                           | Login del panel                      | 4    |
| `/admin/*`                                            | Panel administrativo                 | 6    |
| `/terminos`, `/privacidad`, `/garantias`, `/retracto` | Legales (textos del negocio)         | 5    |

Las combinaciones de filtros usan canonical a la URL limpia de la categoría para evitar
contenido duplicado.

## Pagos (preparado)

`orders.payment_status` y la tabla `payments` existen desde la Fase 1. Una pasarela se integrará
como adaptador en `src/features/payments/providers/<proveedor>.ts` con una interfaz común
(crear intento de pago, verificar webhook firmado). El webhook vivirá en
`src/app/api/webhooks/<proveedor>/route.ts` y actualizará `payments` mediante una función
`security definer`.

## Extensiones futuras (fuera del MVP)

| Módulo             | Encaje en el modelo actual                                          |
| ------------------ | ------------------------------------------------------------------- |
| Configurador de PC | `builds`, `build_items` + `spec_definitions` (socket, TDP, formato) |
| Comunidad          | `profiles` existente + `reviews`, `posts`, `comments`               |
| Servicios técnicos | `technicians`, `service_requests` independientes del catálogo       |

## Pendientes del negocio

- Logo definitivo, dominio y datos de contacto (`src/config/site.ts`).
- Política de envíos (`calculate_shipping_cost`).
- Textos legales: tratamiento de datos (Ley 1581 de 2012), términos, garantías y derecho de
  retracto (Ley 1480 de 2011).
- Si se pedirá cédula/NIT en el checkout (columna `customer_document` ya existe, opcional).
