import type { Request, Response } from "express";
import { AuditRepository } from "./audit.repository.js";
import type { AuditLogResponse } from "./audit.types.js";

export class AuditController {
  constructor(private auditRepository: AuditRepository) {}

  public getAuditLogs = async (
    _req: Request,
    res: Response<AuditLogResponse[]>,
  ) => {
    const logs = await this.auditRepository.findAll();
    return res.status(200).json(logs);
  };
}
