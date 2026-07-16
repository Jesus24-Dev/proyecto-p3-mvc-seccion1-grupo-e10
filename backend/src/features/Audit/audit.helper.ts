import type { Request } from "express";
import { getAuthUser } from "../Auth/auth.middleware.js";
import { AuditRepository } from "./audit.repository.js";

const auditRepository = new AuditRepository();

export interface AuditEntry {
  action: string;
  entity: string;
  entity_id?: string | null;
  detail?: string;
}

/**
 * Registra una acción en la bitácora usando el usuario autenticado de la
 * petición. Nunca lanza: la auditoría no debe romper la operación principal.
 */
export async function recordAudit(req: Request, entry: AuditEntry) {
  try {
    const user = getAuthUser(req);
    await auditRepository.record({
      user_id: user?.id ?? null,
      user_email: user?.email ?? "sistema",
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      detail: entry.detail ?? "",
    });
  } catch (error) {
    console.error("No se pudo registrar la auditoría:", error);
  }
}
