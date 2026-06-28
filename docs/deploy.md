# Deploy: Vercel + Supabase

## 1. Supabase

1. Crea un proyecto en Supabase.
2. En el dashboard, abre SQL Editor.
3. Copia y ejecuta el contenido de:

```text
supabase/migrations/001_initial_schema.sql
```

4. Crea los buckets de Storage cuando ya conectemos subida real:

- `player-photos`
- `enrollment-files`
- `audio-results`

## 2. Variables de entorno

En Supabase copia:

- Project URL
- Anon public key
- Service role key

En Vercel configura:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=admin@gmail.com
OPENAI_API_KEY=...
NEXT_PUBLIC_YAPE_NUMBER=...
NEXT_PUBLIC_PLIN_NUMBER=...
NEXT_PUBLIC_PAYMENT_OWNER=...
```

`OPENAI_API_KEY` puede quedar vacio mientras la IA siga en mock.

## 3. Login Google

En Supabase Auth activa Google como proveedor OAuth.

En Google Cloud, el Authorized redirect URI debe ser el callback de Supabase:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

En Supabase Auth -> URL Configuration, agrega las URLs de retorno de la app:

```text
https://campeonato-full.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

En produccion el admin entra con Google solo si su correo esta en `ADMIN_EMAILS` o tiene `profiles.role = 'admin'`. El delegado entra con el mismo correo Google/Gmail que registro en la inscripcion.

## 4. Vercel

1. Entra a Vercel.
2. New Project.
3. Importa el repo de GitHub.
4. Framework: Next.js.
5. Build command: `npm run build`.
6. Install command: `npm install`.
7. Output directory: dejar vacio/default.
8. Agrega las variables de entorno.
9. Deploy.

## 5. Despues de cambiar variables

Si agregas o cambias variables en Vercel, redeploya el proyecto para que Next las tome en build.

## 6. Estado actual

La app todavia funciona con datos mock. El deploy sirve para revisar pantallas y flujo visual. La siguiente fase es reemplazar mocks por consultas y acciones reales de Supabase.
