# Despliegue del backend (Express + Prisma) con Supabase

La base de datos es **Supabase Postgres**; el backend Express se hospeda aparte
(Render/Railway/Fly). El frontend en Vercel apunta al backend con `VITE_API_URL`.

> Proyecto Supabase: `DomesaOrg` · ref `glvfpicggozxubkyycud`

## 1. Cadena de conexión (Supabase → Settings → Database → Connection string)

Supabase expone un **pooler** (Supavisor, IPv4). La conexión directa
`db.<ref>.supabase.co` es solo IPv6 y no sirve para la mayoría de hosts.

- **Runtime** (transaction pooler, puerto 6543):
  ```
  postgresql://postgres.glvfpicggozxubkyycud:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **Migraciones** (session pooler, puerto 5432 — Prisma necesita conexión
  directa para los locks):
  ```
  postgresql://postgres.glvfpicggozxubkyycud:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
  ```

`<region>` (p. ej. `us-east-1`) sale de la cadena que muestra el panel.

## 2. Variables de entorno del backend

Nunca se comitean; se ponen en el host (Render/Railway) o en `backend/.env`:

```
DATABASE_URL="<transaction pooler, puerto 6543, ?pgbouncer=true>"
DIRECT_URL="<session pooler, puerto 5432>"   # opcional; ver nota Prisma abajo
JWT_SECRET="<cadena larga y aleatoria>"
JWT_EXPIRES_IN="1d"
PORT="3000"
```

## 3. Aplicar el esquema y sembrar datos

Con `DATABASE_URL` apuntando al **session pooler** (5432):

```
npx prisma migrate deploy   # crea todas las tablas
npm run db:seed             # datos de demostración (admin@drlogistics.local / Admin123*)
```

## 4. Conectar el frontend (Vercel)

En Vercel → proyecto → Settings → Environment Variables:

```
VITE_API_URL = https://<url-del-backend>
```

Redesplegar el frontend. El código ya lee `VITE_API_URL` (ver `src/api.ts`); sin
cambios de código.

## Nota Prisma + pooler (opcional, para robustez)

Si el runtime usa el transaction pooler (pgbouncer) y se corren migraciones en el
deploy, añade a `datasource db` en `schema.prisma`:

```prisma
directUrl = env("DIRECT_URL")
```

y define `DIRECT_URL` (session pooler, 5432). Para desarrollo local, apunta
`DIRECT_URL` a la misma URL local que `DATABASE_URL`.
