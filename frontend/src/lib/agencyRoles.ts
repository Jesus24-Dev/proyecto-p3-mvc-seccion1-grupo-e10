import type { AgencyRole } from "../types";

export const AGENCY_ROLES: AgencyRole[] = [
  "OWNER",
  "MANAGER",
  "OPERATOR",
  "VIEWER",
];

export function agencyRoleLabel(role: AgencyRole): string {
  const labels: Record<AgencyRole, string> = {
    OWNER: "Propietario",
    MANAGER: "Gerente",
    OPERATOR: "Operador",
    VIEWER: "Lector",
  };

  return labels[role];
}

/** Qué puede hacer cada rol dentro de su agencia (subcuenta). */
export function agencyRolePermissions(role: AgencyRole): string {
  const permissions: Record<AgencyRole, string> = {
    OWNER:
      "Control total: miembros, envíos, paquetes, conversaciones y automatizaciones.",
    MANAGER:
      "Gestiona miembros, envíos, paquetes y conversaciones de la agencia.",
    OPERATOR: "Registra y actualiza envíos y paquetes; responde conversaciones.",
    VIEWER: "Solo lectura de los datos de la agencia.",
  };

  return permissions[role];
}
