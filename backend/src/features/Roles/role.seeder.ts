import { prisma } from "../../database/prisma";

// Roles base del sistema (módulo 2). Las claves de permiso deben coincidir con
// PERMISSION_CATALOG del frontend.
const systemRoles = [
  {
    name: "Administrador",
    description: "Acceso total a todos los módulos del sistema.",
    permissions: [
      "users.manage",
      "agencies.manage",
      "clients.manage",
      "packages.manage",
      "packages.status",
      "payments.manage",
      "payments.validate",
      "reports.view",
      "automations.manage",
      "config.manage",
      "audit.view",
    ],
  },
  {
    name: "Operador logístico",
    description: "Gestiona paquetes, estados y clientes.",
    permissions: [
      "clients.manage",
      "packages.manage",
      "packages.status",
      "agencies.manage",
    ],
  },
  {
    name: "Atención al cliente",
    description: "Atiende clientes y registra pagos.",
    permissions: ["clients.manage", "payments.manage", "reports.view"],
  },
  {
    name: "Supervisor",
    description: "Supervisa la operación: reportes y auditoría.",
    permissions: [
      "reports.view",
      "audit.view",
      "payments.validate",
      "packages.status",
    ],
  },
];

export async function seedRoles() {
  const seeded = [];
  for (const role of systemRoles) {
    const result = await prisma.app_roles.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
        is_system: true,
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        is_system: true,
      },
      select: { id: true },
    });
    seeded.push(result);
  }
  return seeded;
}
