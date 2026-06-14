# Registro de Cambios: Módulo de Autenticación - Dr Logistics CA

---

## 🏛️ 1. Actualización de la Base de Datos (Prisma & PostgreSQL)

Para dar soporte al flujo de recuperación de contraseñas sin comprometer la seguridad ni guardar estados innecesarios en memoria, se actualizó el esquema de la base de datos.

Se añadieron los siguientes campos al modelo `users` en el archivo `schema.prisma`:
* **`reset_token` (String?)**: Almacena de forma segura el hash del token temporal generado para la recuperación de clave.
* **`reset_token_expires` (DateTime?)**: Define la ventana de validez del token temporal (configurado para expirar en 15 minutos).

> **Comando ejecutado:** `npx prisma migrate dev` para aplicar los cambios a PostgreSQL y regenerar el cliente.

---

## 🛡️ 2. Middlewares de Autorización y Control de Acceso

Se refactorizó la capa de protección de rutas (`auth.middleware.ts`) pasando de un único validador rígido a un sistema modular de dos pasos, ideal para escalar los permisos entre administradores, entrenadores y atletas:

1.  **`requireAuth`**: Extrae el *Bearer Token* de la cabecera HTTP, verifica su firma criptográfica y su vigencia usando `jsonwebtoken`. Luego, inyecta el payload directamente en `req.user` para su disponibilidad global en la petición.
2.  **`requireRoles(allowedRoles: roles[])`**: Middleware dinámico que intercepta la petición y valida si el rol del usuario autenticado coincide con los roles permitidos para ese endpoint en específico.

---

## ⚙️ 3. Lógica de Negocio y Repositorio (`Service` & `Repository`)

Se separaron estrictamente las responsabilidades entre la manipulación de datos y las reglas del sistema:

* **`AuthRepository`**: Ahora incluye métodos dedicados exclusivamente a interactuar con la base de datos, como la actualización del hash de la contraseña (`updatePassword`) y la gestión de los campos de los tokens de recuperación.
* **`AuthService`**: 
    * **`changePassword`**: Valida credenciales actuales (`bcrypt.compare`) antes de aplicar cambios.
    * **`requestPasswordReset`**: Utiliza `crypto` nativo de Node.js para generar un token aleatorio seguro y lo guarda hasheado en la base de datos junto con su caducidad.
    * **`resetPassword`**: Verifica la integridad y vigencia del token recibido antes de hashear y persistir la nueva contraseña, limpiando los tokens residuales en el proceso.

---

## 🛣️ 4. Flujo de Controladores y Rutas

Se definieron rutas independientes para proteger la experiencia del usuario y delegar la validación de entrada a la capa correcta (`auth.controller.ts`):

* **POST `/auth/request-password-reset`**: Recibe únicamente el email del usuario para disparar la generación del token.
* **POST `/auth/reset-password`**: Recibe el token y las nuevas credenciales. El **Controlador** asume la responsabilidad de validar que `newPassword === confirmPassword` rechazando la petición con un `400 Bad Request` en caso de discrepancia, antes de invocar al servicio.

---

## ⚠️ PENDIENTE DE IMPLEMENTACIÓN (FRONTEND)

### 🚪 Responsabilidad del Cierre de Sesión (Logout)


**Acciones requeridas por parte del Frontend al ejecutar un Logout:**
1.  **Eliminación de Persistencia:** Borrar permanentemente el token JWT de cualquier mecanismo de almacenamiento local (`localStorage`, `sessionStorage` o borrado explícito de cookies del navegador).
2.  **Limpieza de Estado Global:** Purgar cualquier contexto de la aplicación que mantenga en memoria los datos del usuario logueado.
3.  **Redirección:** Enviar al usuario inmediatamente a la pantalla de Login público.
4.  **Saneamiento de Peticiones:** Asegurar que las instancias de clientes HTTP (como Axios o Fetch) eliminen el header `Authorization: Bearer <token>` para futuras peticiones, evitando accesos no deseados.