Equipo E10 - Evaluación 2

Calificación: 18/20

Desglose:
- Análisis / planteamiento del proyecto mínimo: 5/6
- Diseño propuesto MVC: 4/4
- Implementación MVC: 5.6/6
- Uso de Git: 1.9/2
- README: 1.5/2

Fortalezas:
El repositorio presenta una implementación técnica sólida y bien organizada. Aunque no parte necesariamente de un sistema original refactorizado, cumple con la alternativa indicada para la evaluación: desarrollar un proyecto mínimo o funcional aplicando correctamente MVC/capas.

Se observa una arquitectura backend con Express, TypeScript, Prisma y PostgreSQL, organizada por features o dominios funcionales como Auth, Users, UsersInformation, Agencies y Orders. Esta organización supera la idea básica de un CRUD mínimo y demuestra una buena comprensión de separación de responsabilidades.

Se valora especialmente el módulo de autenticación. Las rutas reciben las peticiones y aplican validación mediante schemas, el controlador coordina la respuesta HTTP, el servicio maneja la lógica de autenticación, hashing, JWT y errores, y el repositorio encapsula el acceso a datos mediante Prisma. Esta separación demuestra una comprensión avanzada del patrón MVC/capas.

El README está bien trabajado en cuanto a instalación, configuración de base de datos, variables de entorno, uso de Prisma, seeders, credenciales de prueba, endpoints y comandos frecuentes. También se observa un uso sólido de Git, con commits progresivos y mensajes descriptivos como feat(auth), feat(backend), feat(frontend), feat(database), entre otros.

Aspectos a mejorar:
El README debería explicar de forma más explícita que el equipo optó por una implementación funcional/mínima o alternativa, y señalar qué módulos fueron desarrollados bajo MVC. También sería recomendable incluir una sección académica breve que explique el flujo MVC aplicado: ruta → controlador → servicio → repositorio/modelo → base de datos → respuesta.

Aunque el README tiene muy buenas instrucciones de ejecución, le falta una sección de cambios realizados y evidencia de Git, indicando cómo fue evolucionando el proyecto y qué aportes realizaron los integrantes.

Recomendación:
Agregar al README una sección formal de “Arquitectura MVC aplicada”, una breve justificación del proyecto mínimo/alternativo desarrollado y un resumen de cambios realizados con evidencia de Git. Técnicamente el proyecto está muy bien encaminado.
