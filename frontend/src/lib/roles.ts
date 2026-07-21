import type { UserRole } from "../types";

export const roles: UserRole[] = [
  "USER",
  "ADMIN",
  "DISTRIBUTOR",
  "SUPERADMIN",
];

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    USER: "Cliente",
    ADMIN: "Administrador",
    DISTRIBUTOR: "Distribuidor",
    SUPERADMIN: "Superadministrador",
  };

  return labels[role];
}

/** Rol con el máximo nivel de permisos (papelera, borrado definitivo). */
export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === "SUPERADMIN";
}
