![sistema-domesa](image.png)

# Dr-Logistics-CA

Sistema de gestión logística, pagos y clientes para una red courier (inspirado en operadores venezolanos como Domesa, Zoom y MRW). Proyecto universitario de la unidad curricular Programación 3 — Sección 1, Grupo E10.

Aplicación dividida en dos partes:

- `backend/`: API en Express + TypeScript + Prisma + PostgreSQL, organizada por features bajo el patrón MVC/por capas.
- `frontend/`: panel administrativo en React + Vite + Tailwind + shadcn/ui con dashboard de métricas y CRUDs de usuarios, agencias, envíos y contactos.

## Alcance del proyecto

El equipo optó por la alternativa de **proyecto mínimo/funcional aplicando MVC**: en lugar de refactorizar un sistema existente, se desarrolló desde cero un sistema operativo completo. El mapa mental del sistema contempla cuatro actores (Clientes, Mercado Libre, Banco Mercantil y Personal Administrativo); esta entrega implementa la rebanada del **Personal Administrativo**: autenticación, gestión de usuarios, agencias, órdenes de envío e información de contacto.

Los módulos desarrollados bajo MVC/capas son: **Auth**, **Users**, **UsersInformation**, **Agencies**, **Orders**, **Packages**, **Memberships** y **Automations**.

## Arquitectura MVC aplicada

Cada feature del backend sigue el mismo flujo de capas:

```text
Petición HTTP
  → Ruta (feature.routes.ts): recibe la petición, aplica middleware de
    autenticación (requireAdmin) y validación de esquema (Zod).
  → Controlador (feature.controller.ts): coordina la petición y arma la
    respuesta HTTP (códigos de estado, mensajes de error).
  → Servicio (feature.service.ts): concentra la lógica de negocio
    (hashing de contraseñas, firma de JWT, reglas y errores de dominio).
  → Repositorio (feature.repository.ts): encapsula el acceso a datos
    mediante Prisma (el "modelo").
  → Base de datos (PostgreSQL) y de vuelta: respuesta JSON al cliente.
```

La **vista** es el frontend en React: consume la API vía `frontend/src/api.ts`, mantiene la sesión JWT en `localStorage` y presenta los datos en páginas por módulo (`frontend/src/pages/`).

## Requisitos

- Node.js 20+ y npm 10+
- Docker Desktop (recomendado) **o** PostgreSQL local

## Opción A (recomendada): levantar con Docker

La base de datos y la API se levantan con un solo comando.

```bash
# 1. Variables de entorno (obligatorio: JWT_SECRET)
cp .env.example .env
# edita .env y define JWT_SECRET (por ejemplo: openssl rand -hex 32)

# 2. Base de datos + API (migraciones y seeders corren solos)
docker compose up --build
```

La API queda en `http://localhost:3001` (configurable con `BACKEND_PORT`). El código de `backend/src` está montado en el contenedor, así que los cambios se recargan en caliente.

```bash
# 3. Frontend
cd frontend
npm install
echo 'VITE_PROXY_TARGET=http://localhost:3001' > .env.local
npm run dev
```

El panel queda en `http://localhost:5173`.

> Nota: el seeder corre en cada arranque del contenedor y restablece las
> cuentas de prueba (es idempotente y es un comportamiento intencional para
> demos: la contraseña del admin siempre vuelve a ser la documentada abajo).

## Opción B: PostgreSQL local sin Docker

1. Crea una base de datos vacía y configura `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PUERTO/NOMBRE_DB"
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
JWT_EXPIRES_IN="1d"
PORT=3000
```

2. Prepara Prisma y los datos, y arranca la API (desde `backend/`):

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

3. Arranca el frontend (desde `frontend/`): `npm install && npm run dev`. El proxy de Vite apunta por defecto a `http://localhost:3000`; si tu API corre en otro puerto, define `VITE_PROXY_TARGET` en `frontend/.env.local`.

## Credenciales de prueba

Con los seeders ejecutados puedes entrar al panel con:

```text
admin@drlogistics.local
Admin123*
```

## Módulos del panel

- **Dashboard**: métricas de la red (usuarios, agencias, envíos, montos), distribución de envíos por estado y órdenes recientes.
- **Usuarios**: CRUD de cuentas (Administrador, Distribuidor, Cliente).
- **Agencias**: CRUD de sucursales con responsable, ubicación y estado.
- **Envíos**: CRUD de órdenes con ruta origen→destino, cliente, monto y los nueve estados del ciclo de vida de una transferencia.
- **Paquetes**: registro de paquetes físicos con código de rastreo único generado por el servidor (DRL-AÑO-XXXXXXXX), destinatario (contacto), peso, estado físico (recibido → en tránsito → en almacén → en reparto → entregado / devuelto) y envío asignado.
- **Contactos**: ficha personal 1:1 por usuario (nombre, dirección, nacimiento) con etiquetas de segmentación.
- **Subcuentas de agencia**: selector de agencia activa en la barra superior (estilo GHL) que acota los datos del panel; cada agencia gestiona sus miembros con roles internos (Propietario, Gerente, Operador, Lector) y permisos descritos.
- **Conversaciones**: bandeja estilo WhatsApp sobre los contactos reales, con estados de entrega (enviado/entregado/leído) y sincronización simulada de alta fidelidad.
- **Automatizaciones**: editor visual de flujos (React Flow) con disparadores y pasos de esperar, enviar WhatsApp, enviar email y agregar etiqueta; los flujos se guardan en la base de datos (el motor de ejecución queda fuera del alcance de esta entrega).

## API

Endpoints principales (todos los módulos de datos requieren un Bearer token con rol `ADMIN`):

| Método(s) | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Inicia sesión y devuelve el JWT |
| POST | `/auth/register` | Registro público (siempre crea cuentas `USER`) |
| GET/POST/PUT/DELETE | `/users` | CRUD de usuarios (solo ADMIN) |
| GET/POST/PUT/DELETE | `/agencies` | CRUD de agencias (solo ADMIN) |
| GET/POST/PUT/DELETE | `/orders` | CRUD de órdenes (solo ADMIN) |
| GET/POST/PUT/DELETE | `/packages` | CRUD de paquetes con tracking generado (solo ADMIN) |
| GET/POST/PUT/DELETE | `/info` | CRUD de información de contacto (solo ADMIN) |
| GET/POST/PUT/DELETE | `/memberships` | Miembros por agencia con rol interno (solo ADMIN) |
| GET/POST/PUT/DELETE | `/automations` | Flujos del editor de automatizaciones (solo ADMIN) |

Notas de seguridad:

- El registro público **no** acepta rol: las cuentas privilegiadas se crean desde el panel por un administrador autenticado.
- El frontend guarda la sesión en `localStorage` bajo la clave `dr-logistics-admin-session` y la invalida automáticamente ante respuestas 401/403.

## Cambios realizados y evidencia de Git

El proyecto evolucionó en fases visibles en el historial de commits (`git log --oneline`):

1. **Base MVC** — features de Auth, Users, UsersInformation, Agencies y Orders con rutas, controladores, servicios y repositorios (`feat(auth)`, `feat(backend)`, `feat(database)`).
2. **Primer frontend** — panel administrativo en React con login y gestión de usuarios/agencias (`feat(frontend)`).
3. **Sistema de diseño** — contexto de producto y diseño documentados (`PRODUCT.md`, `DESIGN.md`) y refinamiento tipográfico/cromático (`style(frontend)`).
4. **Endurecimiento** — mensajes de error significativos en español en toda la API, cierre del registro público con rol arbitrario, protección de `/orders` e `/info` con `requireAdmin` (`fix(backend)`).
5. **Infraestructura** — dockerización del backend con PostgreSQL, migraciones y seeders automáticos (`feat: dockeriza`, `chore(docker)`).
6. **Panel completo** — reconstrucción de la interfaz con Tailwind + shadcn/ui: shell con navegación lateral, dashboard de métricas y CRUDs de los cuatro módulos de datos, verificados de extremo a extremo con un navegador real (`feat(frontend)`).

## Comandos frecuentes

```bash
# Stack completo con Docker
docker compose up --build      # levantar db + api
docker compose down            # detener
docker compose logs -f backend # logs de la API

# Backend (local)
cd backend && npm run dev
npm run db:seed
npx prisma studio

# Frontend
cd frontend && npm run dev
npm run build
npm run lint
```
