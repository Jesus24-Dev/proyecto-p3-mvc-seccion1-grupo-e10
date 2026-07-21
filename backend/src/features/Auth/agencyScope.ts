import type { Request } from "express";
import { prisma } from "../../database/prisma";
import { getAuthUser } from "./auth.middleware.js";

/**
 * Alcance de agencias de una petición.
 * - `all: true`  → sin límite (administrador de agencia / superadmin).
 * - `all: false` → solo las agencias en `ids` (administrador de sede, o
 *   cualquiera cuando hay una subcuenta activa seleccionada).
 */
export type AgencyScope = { all: boolean; ids: string[] };

/**
 * Resuelve qué agencias puede ver el usuario autenticado:
 *  1. ADMIN/SUPERADMIN tienen acceso a todas; el resto solo a las agencias
 *     donde son miembros (alcance por sede).
 *  2. Si la petición trae la cabecera `X-Active-Agency` (subcuenta activa) y
 *     está dentro del alcance permitido, se acota a esa sola agencia
 *     (vista de subcuenta). Sin cabecera = vista agregada.
 */
export async function resolveAgencyScope(
  req: Request,
  // `applyActive: false` ignora la subcuenta activa y devuelve TODO el alcance
  // permitido. Se usa para la lista de agencias (el selector necesita ver todas
  // las subcuentas para poder cambiar entre ellas).
  options: { applyActive?: boolean } = {},
): Promise<AgencyScope> {
  const { applyActive = true } = options;
  const user = getAuthUser(req);
  if (!user) {
    return { all: false, ids: [] };
  }

  const isAllAccess = user.role === "ADMIN" || user.role === "SUPERADMIN";

  let allowed: string[] = [];
  if (!isAllAccess) {
    const memberships = await prisma.agency_members.findMany({
      where: { user_id: user.id },
      select: { agency_id: true },
    });
    allowed = memberships.map((m) => m.agency_id);
  }

  const header = req.headers["x-active-agency"];
  const active = typeof header === "string" && header.trim() ? header.trim() : null;

  if (applyActive && active && (isAllAccess || allowed.includes(active))) {
    // Vista de subcuenta: una sola agencia.
    return { all: false, ids: [active] };
  }

  if (isAllAccess) {
    return { all: true, ids: [] };
  }
  // Administrador de sede en vista agregada: todas SUS agencias.
  return { all: false, ids: allowed };
}
