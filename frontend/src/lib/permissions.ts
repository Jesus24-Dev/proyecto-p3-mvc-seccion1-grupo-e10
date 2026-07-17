// Catálogo de permisos por módulo. Las claves coinciden con las que guarda el
// backend en app_roles.permissions y con la semilla de roles del sistema.

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  module: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    module: "Usuarios y acceso",
    permissions: [
      { key: "users.manage", label: "Gestionar usuarios" },
      { key: "agencies.manage", label: "Gestionar agencias" },
    ],
  },
  {
    module: "Clientes",
    permissions: [{ key: "clients.manage", label: "Gestionar clientes" }],
  },
  {
    module: "Logística",
    permissions: [
      { key: "packages.manage", label: "Gestionar paquetes" },
      { key: "packages.status", label: "Cambiar estados de paquetes" },
    ],
  },
  {
    module: "Pagos",
    permissions: [
      { key: "payments.manage", label: "Registrar pagos" },
      { key: "payments.validate", label: "Validar pagos" },
    ],
  },
  {
    module: "Operación",
    permissions: [
      { key: "reports.view", label: "Ver reportes" },
      { key: "automations.manage", label: "Gestionar automatizaciones" },
      { key: "audit.view", label: "Ver auditoría" },
      { key: "config.manage", label: "Configuración del sistema" },
    ],
  },
];

const LABELS = new Map(
  PERMISSION_CATALOG.flatMap((group) =>
    group.permissions.map((p) => [p.key, p.label] as const),
  ),
);

export function permissionLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.flatMap((group) =>
  group.permissions.map((p) => p.key),
);
