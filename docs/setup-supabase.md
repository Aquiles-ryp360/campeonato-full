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
```

En Vercel agrega las mismas variables en Project Settings -> Environment Variables.

## 3. Migracion

Aplica `supabase/migrations/001_initial_schema.sql` desde Supabase SQL Editor o con Supabase CLI.

## 4. Buckets sugeridos

- `player-photos`: fotos opcionales de jugadores.
- `payment-proofs`: comprobantes si se decide subir captura.
- `audio-results`: audios de resultados.

## 5. Usuarios

Crea al menos un usuario admin y luego actualiza su perfil:

```sql
insert into public.profiles (id, role, full_name, phone)
values ('AUTH_USER_UUID', 'admin', 'Admin Campeonato', '999999999');
```
