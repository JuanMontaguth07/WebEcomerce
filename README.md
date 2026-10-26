# Tienda de hardware

E-commerce de componentes de PC, hardware y computadores ensamblados para Colombia.
Modelo de tienda propia: la empresa administra productos, precios, inventario y pedidos.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 ·
Supabase (PostgreSQL, Auth, Storage) · Vercel.

> Estado: **Fase 7 — SEO y rendimiento.** Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requisitos

- Node.js 24 LTS (mínimo 20.9) y npm 10+.
- Una cuenta de [Supabase](https://supabase.com) con dos proyectos: `dev` y `prod`.
- Docker **no** es necesario: se trabaja contra el proyecto `dev` en la nube y las pruebas de
  base de datos usan PostgreSQL en memoria (PGlite).

## Instalación

```bash
npm install
cp .env.example .env.local   # luego completa los valores
```

### Conectar Supabase (una vez por entorno)

```bash
npx supabase login                       # abre el navegador
npx supabase link --project-ref <ref>    # el ref está en la URL del proyecto
npx supabase db push                     # aplica supabase/migrations
```

### Cargar datos de demostración (solo en `dev`)

```bash
npx supabase db query --linked -f supabase/seed.sql
```

Carga 30 productos ficticios (SKU `DEMO-`) solo si la base no tiene productos. **Nunca** lo
ejecutes contra producción.

### Crear el primer administrador

El registro público está desactivado. En Supabase → **Authentication → Users → Add user**, crea el
usuario y luego, en **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@dominio.com';
```

Luego ingresa en `/ingresar` (o abre `/admin`). La contraseña debe tener al menos 10 caracteres
con minúsculas, mayúsculas y números.

## Desarrollo

| Comando                | Qué hace                                          |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Servidor local en http://localhost:3000           |
| `npm run build`        | Build de producción                               |
| `npm run lint`         | ESLint                                            |
| `npm run typecheck`    | Genera tipos de rutas y ejecuta `tsc`             |
| `npm test`             | Pruebas unitarias y de base de datos (Vitest)     |
| `npm run check`        | Lint + typecheck + pruebas                        |
| `npm run format`       | Prettier                                          |
| `npm run db:new <nom>` | Crea una migración nueva en `supabase/migrations` |
| `npm run db:push`      | Aplica migraciones al proyecto enlazado           |
| `npm run db:types`     | Regenera los tipos TypeScript del esquema         |

### Flujo de cambios en la base de datos

1. `npm run db:new nombre_del_cambio` y escribe el SQL.
2. `npm test`: las pruebas aplican **todas** las migraciones sobre PGlite.
3. `npm run db:push` contra `dev`; verifica; luego enlaza `prod` y repite.

Nunca edites una migración ya aplicada en producción: crea una nueva.

## Despliegue (Vercel)

1. Sube el repositorio a GitHub e impórtalo en Vercel (framework: Next.js).
2. En GitHub → Settings → Secrets and variables → Actions → **Variables**, crea
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores de `dev`
   (el CI compila el catálogo con esos datos).
3. Define las variables de `.env.example` para **Production** (proyecto Supabase `prod`) y para
   **Preview** (proyecto `dev`).
4. En Supabase `prod` → Authentication → URL Configuration: `Site URL` = dominio final y agrega
   `https://<dominio>/**` a Redirect URLs.
5. Dominio propio: Vercel → Settings → Domains. HTTPS se emite automáticamente.

Solo el entorno `production` de Vercel es indexable por buscadores; previews y local envían
`noindex`.

## Estructura

```
src/
  app/          Rutas (App Router)
  components/   UI reutilizable (ui/, layout/, motion/, providers/, shop/, admin/)
  features/     Lógica de negocio por dominio (catalog, cart, checkout, orders, inventory, auth)
  lib/          Infraestructura: env, errores, formato, clientes Supabase
  config/       Datos de la marca
  proxy.ts      Refresco de sesión para /admin
supabase/
  migrations/   Esquema versionado (fuente de verdad de la base de datos)
tests/db/       Pruebas de esquema, RLS y funciones transaccionales
docs/           Arquitectura y decisiones (ADR)
```
