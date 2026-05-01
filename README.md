![sistema-domesa](image.png)

# Dr-Logistics-CA

Aplicación dividida en dos partes:

- `backend/`: API en Express + TypeScript + Prisma + PostgreSQL.
- `frontend/`: panel administrativo en React + Vite.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL disponible local o remotamente

## Estructura

```text
Dr-Logistics-CA/
├─ backend/
└─ frontend/
```

## 1. Instalar dependencias

Este repositorio no tiene un `package.json` en la raíz, así que la instalación se hace por carpeta.

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## 2. Configurar la base de datos

Crea una base de datos PostgreSQL vacía y configura la conexión en el backend.

Crea un archivo `backend/.env` con al menos estas variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PUERTO/NOMBRE_DB"
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
JWT_EXPIRES_IN="1d"
```

Variables importantes:

- `DATABASE_URL`: cadena de conexión de PostgreSQL.
- `JWT_SECRET`: secreto usado para firmar JWT.
- `JWT_EXPIRES_IN`: duración del token. Es opcional.

## 3. Preparar Prisma

Todos estos comandos se ejecutan dentro de `backend/`.

### Generar el cliente de Prisma

```bash
cd backend
npx prisma generate
```

### Aplicar migraciones

```bash
npx prisma migrate deploy
```

Si estás desarrollando cambios nuevos de esquema en local, también puedes usar:

```bash
npx prisma migrate dev
```

### Comandos útiles de Prisma

```bash
npx prisma studio
npx prisma db seed
npx prisma generate
```

## 4. Cargar datos iniciales

El backend tiene un seeder centralizado que ejecuta seeders por feature.

Desde `backend/` puedes usar cualquiera de estas opciones:

```bash
npm run db:seed
```

```bash
npx prisma db seed
```

El flujo de seed carga usuarios, agencias, información de usuario y órdenes.

## 5. Arrancar el backend

Desde `backend/`:

```bash
npm run dev
```

La API arranca por defecto en:

```text
http://localhost:3000
```

Healthcheck disponible en:

```text
GET http://localhost:3000/
```

Respuesta esperada:

```json
{
  "status": "ok"
}
```

## 6. Arrancar el frontend

Desde `frontend/`:

```bash
npm run dev
```

El frontend de Vite arranca por defecto en:

```text
http://localhost:5173
```

En desarrollo, el frontend ya tiene proxy configurado hacia el backend para estas rutas:

- `/auth`
- `/users`
- `/agencies`

## 7. Credenciales de prueba

Si ejecutaste el seeder, puedes entrar al panel con:

```text
admin@drlogistics.local
Admin123*
```

## 8. Autenticación y acceso administrativo

Endpoints principales de autenticación:

### Login

```http
POST /auth/login
```

Body:

```json
{
  "email": "admin@drlogistics.local",
  "password": "Admin123*"
}
```

### Registro

```http
POST /auth/register
```

Body:

```json
{
  "email": "admin@drlogistics.local",
  "password": "Admin123*",
  "role": "ADMIN"
}
```

Notas:

- `/users` y `/agencies` requieren un Bearer token válido con rol `ADMIN`.
- El frontend guarda la sesión en `localStorage` bajo la clave `dr-logistics-admin-session`.

## 9. Comandos frecuentes

### Backend

```bash
cd backend
npm install
npm run dev
npm run db:seed
npx prisma generate
npx prisma migrate deploy
npx prisma studio
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

## 10. Orden recomendado de arranque

Si vas a levantar el proyecto desde cero, esta es la secuencia recomendada:

1. Instalar dependencias en `backend/` y `frontend/`.
2. Crear `backend/.env` con `DATABASE_URL` y `JWT_SECRET`.
3. Ejecutar `npx prisma generate` en `backend/`.
4. Ejecutar `npx prisma migrate deploy` en `backend/`.
5. Ejecutar `npm run db:seed` en `backend/`.
6. Ejecutar `npm run dev` en `backend/`.
7. Ejecutar `npm run dev` en `frontend/`.
