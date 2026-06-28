# Setup Supabase

## 1. Crear proyecto

Crea un proyecto en Supabase y copia:

- Project URL.
- Anon public key.
- Service role key.

## 2. Variables

En local:

```bash
cp .env.example .env.local
```

Completa:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=admin@gmail.com
```

En Vercel agrega las mismas variables en Project Settings -> Environment Variables.

## 3. Login con Google

En Supabase Auth activa el proveedor Google.

En Google Cloud, configura como Authorized redirect URI el callback que muestra Supabase para Google:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

En Supabase Auth -> URL Configuration, agrega las URLs a las que Supabase puede devolver al usuario:

```text
https://campeonato-full.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

`ADMIN_EMAILS` es una lista separada por comas. Esos correos entran como admin al autenticarse con Google. Los delegados entran solo si su correo coincide con `teams.delegate_email`.

## 4. Migracion

Aplica las migraciones de `supabase/migrations` desde Supabase SQL Editor o con Supabase CLI, en orden numerico.

## 5. Buckets sugeridos

- `player-photos`: fotos opcionales de jugadores.
- `payment-proofs`: comprobantes si se decide subir captura.
- `audio-results`: audios de resultados.

## 6. Usuarios

Crea al menos un usuario admin por Google. Si no usas `ADMIN_EMAILS`, luego actualiza su perfil:

```sql
insert into public.profiles (id, role, full_name, phone)
values ('AUTH_USER_UUID', 'admin', 'Admin Campeonato', '999999999');
```
