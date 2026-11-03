# Despliegue

Dos proyectos de Supabase y uno de Vercel:

| Entorno                | Supabase      | Vercel                           |
| ---------------------- | ------------- | -------------------------------- |
| Desarrollo y previews  | `tienda-dev`  | Previews (ramas y pull requests) |
| Producción (la tienda) | `tienda-prod` | Production (rama `main`)         |

Tienda publicada: **https://kovastudio-sigma.vercel.app** (dirección de producción de Vercel
hasta conectar un dominio propio).

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

> **Orden al publicar cambios con migraciones nuevas:** primero `db push` a producción y
> después `git push`, para que el código nuevo encuentre las tablas.

## 2. Vercel

1. **Add New → Project** → importar el repositorio de GitHub. Framework: Next.js (automático).
2. **Environment Variables**:

   | Variable                               | Production                        | Preview                    |
   | -------------------------------------- | --------------------------------- | -------------------------- |
   | `NEXT_PUBLIC_SITE_URL`                 | `https://<dominio de producción>` | la misma URL de producción |
   | `NEXT_PUBLIC_SUPABASE_URL`             | URL de `tienda-prod`              | URL de `tienda-dev`        |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key de `tienda-prod`  | la de `tienda-dev`         |

   Nunca agregues la `secret key` / `service_role`: la aplicación no la usa.
   Si `NEXT_PUBLIC_SITE_URL` no está definida, en Vercel se usa el dominio de producción del
   proyecto (`NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`). Si está definida, debe empezar por
   `https://`.

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
- **Correos de la tienda**: ver la sección 5.
- **Correo de la cuenta (SMTP)**: el SMTP incluido en Supabase solo envía a miembros del equipo.
  Con el dominio verificado en Resend (sección 5), en Supabase → Authentication → Emails → SMTP
  usa `smtp.resend.com`, puerto 465, usuario `resend` y como contraseña una clave de Resend.
- **Pagos**: integración con Wompi o Mercado Pago (ver `docs/ARCHITECTURE.md` → Pagos).
- **Datos del negocio** en `src/config/site.ts` y textos legales revisados por un abogado.

## 5. Correos de la tienda (Resend)

La tienda ya trae los correos programados (`src/features/notifications`): **pedido recibido**
al cliente (con su enlace y cómo pagar por Nequi), **confirmado / despachado / cancelado**,
**comprobante rechazado** con el motivo, y a los administradores **pedido nuevo** y
**comprobante subido**. Están apagados hasta completar estos pasos:

1. **Dominio propio** (p. ej. `kovastudio.co`): cómpralo en Vercel → Domains (o en otro registrador
   y apunta sus DNS a Vercel). Conéctalo al proyecto y actualiza `NEXT_PUBLIC_SITE_URL` (los
   enlaces de los correos salen de ahí) y las URL de Supabase Auth de la sección 4.
2. **Resend** (resend.com): crea la cuenta → Domains → Add domain con tu dominio. Te muestra
   registros DNS (MX, TXT de SPF y DKIM): agrégalos en Vercel → Domains → DNS Records y espera a
   que Resend lo marque como verificado.
3. **Clave**: Resend → API Keys → Create (permiso «Sending access»).
4. **Vercel → Settings → Environment Variables** (Production), sin `NEXT_PUBLIC_`:
   - `RESEND_API_KEY` = la clave (`re_…`)
   - `EMAIL_FROM` = `Kova Studio <pedidos@kovastudio.co>` (cualquier dirección de tu dominio)
   - `ADMIN_NOTIFY_EMAILS` = los correos de los admins separados por coma
5. **Redeploy** y haz un pedido de prueba: debe llegar la confirmación al correo del pedido y el
   aviso a los admins. Las respuestas del cliente van al correo de soporte de Configuración.

Si Resend falla, el pedido igual se crea: el error queda en los registros de Vercel (`sendEmail`).
Los pedidos que vencen solos (48 h) no envían correo.
