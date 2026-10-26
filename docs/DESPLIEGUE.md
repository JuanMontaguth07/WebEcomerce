# Despliegue

Dos proyectos de Supabase y uno de Vercel:

| Entorno                | Supabase      | Vercel                           |
| ---------------------- | ------------- | -------------------------------- |
| Desarrollo y previews  | `tienda-dev`  | Previews (ramas y pull requests) |
| Producción (la tienda) | `tienda-prod` | Production (rama `main`)         |

El proyecto vinculado con el CLI (`supabase link`) es siempre **desarrollo**. Producción se
administra con `--project-ref`, para no aplicarle cambios por accidente.

## 1. Base de datos de producción

```bash
# Migraciones (nunca con --include-seed: el seed es de demostración)
npx supabase db push --project-ref <REF_PROD> --dry-run   # revisar qué se aplicará
npx supabase db push --project-ref <REF_PROD>

# Autenticación (registro cerrado, contraseñas, URLs). Revisa el diff antes de aceptar.
npx supabase config diff --project-ref <REF_PROD>
npx supabase config push --project-ref <REF_PROD>
```

La contraseña de la base se escribe solo en la terminal cuando el CLI la pide. Las URLs de
producción están en `config.toml` → `[remotes.produccion.auth]`.

### Primer administrador

1. Supabase → `tienda-prod` → Authentication → Users → **Add user** → _Create new user_
   (marca _Auto Confirm User_).
2. SQL Editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'TU_CORREO');
   ```

## 2. Vercel

1. **Add New → Project** → importar el repositorio de GitHub. Framework: Next.js (automático).
2. **Environment Variables**:

   | Variable                               | Production                        | Preview                    |
   | -------------------------------------- | --------------------------------- | -------------------------- |
   | `NEXT_PUBLIC_SITE_URL`                 | `https://<dominio de producción>` | la misma URL de producción |
   | `NEXT_PUBLIC_SUPABASE_URL`             | URL de `tienda-prod`              | URL de `tienda-dev`        |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key de `tienda-prod`  | la de `tienda-dev`         |

   Nunca agregues la `secret key` / `service_role`: la aplicación no la usa.

3. Deploy. Solo producción se indexa en buscadores (`VERCEL_ENV=production`).

## 3. Verificación

```bash
E2E_BASE_URL=https://<dominio de producción> npm run test:e2e
```

Son pruebas de solo lectura: no crean pedidos ni cambian datos.

## 4. Pendiente antes de vender

- **Dominio**: Vercel → Settings → Domains. Luego actualiza `NEXT_PUBLIC_SITE_URL` y
  `[remotes.produccion.auth]` (`site_url` y `additional_redirect_urls`) y vuelve a hacer
  `config push`.
- **Correo (SMTP)**: el SMTP incluido en Supabase solo envía a miembros del equipo. Configura
  uno propio (Resend, Brevo…) con el dominio en Supabase → Authentication → Emails → SMTP.
- **Pagos**: integración con Wompi o Mercado Pago (ver `docs/ARCHITECTURE.md` → Pagos).
- **Datos del negocio** en `src/config/site.ts` y textos legales revisados por un abogado.
