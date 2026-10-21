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
