## Guía de Configuración Inicial

Sigue estos pasos para configurar el entorno de desarrollo en tu máquina local. Esta guía asume que tienes instalado Node.js y PostgreSQL.

### Versiones

Node.js v24.0.4
PostgreSQL >= 6.2.0

## Requisitos Previos:

- Configuración de la Base de Datos:

Antes de ejecutar la aplicación, es indispensable contar con una base de datos PostgreSQL activa. Según tu sistema operativo, puedes utilizar los siguientes métodos:

En Windows (Recomendado: pgAdmin 4)

- Abre pgAdmin 4.
- Haz clic derecho en el nodo Databases y selecciona Create > Database....
- Asigna un nombre a la base de datos (asegúrate de que coincida con tu variable de entorno DATABASE_URL en el archivo .env).

En Linux (Recomendado: psql)

- Ejecuta los siguientes comandos en tu terminal para crear la base de datos rápidamente:

```Bash
sudo -u postgres psql
CREATE DATABASE nombre_de_tu_db;
```

### 🏃 Pasos para la Instalación

Una vez que tu base de datos esté lista, sigue esta secuencia de comandos en la terminal de tu proyecto:

1. Instalación de dependencias

Descarga todos los paquetes necesarios definidos en el package.json:

```Bash
npm install
```

2. Despliegue de la base de datos

Aplica las migraciones pendientes para sincronizar el esquema de Prisma con tu base de datos local:

```Bash
npx prisma migrate deploy
```

3. Generación del cliente de Prisma

Genera el código del Prisma Client para habilitar el autocompletado y tipado en tu editor:

```Bash
npx prisma generate
```

4. Iniciar el servidor de desarrollo

Lanza la aplicación en modo de desarrollo:

```Bash
npm run dev
```

Nota: No olvides configurar tu archivo .env en la raíz del proyecto con las credenciales de acceso a tu base de datos local antes de iniciar las migraciones.
