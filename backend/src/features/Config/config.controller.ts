import type { Request, Response } from "express";
import { ConfigRepository } from "./config.repository.js";
import type { UpdateConfigBody } from "./config.schema.js";
import { recordAudit } from "../Audit/audit.helper.js";

export class ConfigController {
  constructor(private repository: ConfigRepository) {}

  public getConfig = async (_req: Request, res: Response) => {
    const config = await this.repository.get();
    return res.status(200).json(config);
  };

  public updateConfig = async (
    req: Request<{}, {}, UpdateConfigBody>,
    res: Response,
  ) => {
    const config = await this.repository.update(req.body);
    await recordAudit(req, {
      action: "config.update",
      entity: "config",
      detail: "Actualizó la configuración del sistema",
    });
    return res.status(200).json(config);
  };
}
