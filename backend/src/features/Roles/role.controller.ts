import type { Request, Response } from "express";
import { RoleService, RoleServiceError } from "./role.service.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateRoleBody, UpdateRoleBody } from "./role.schema.js";
import { recordAudit } from "../Audit/audit.helper.js";

export class RoleController {
  constructor(private service: RoleService) {}

  public getRoles = async (_req: Request, res: Response) => {
    const roles = await this.service.getAll();
    return res.status(200).json(roles);
  };

  public createRole = async (
    req: Request<{}, {}, CreateRoleBody>,
    res: Response,
  ) => {
    try {
      const role = await this.service.create(req.body);
      await recordAudit(req, {
        action: "role.create",
        entity: "role",
        entity_id: role.id,
        detail: `Creó el rol ${role.name}`,
      });
      return res.status(201).json(role);
    } catch (error) {
      return this.fail(res, error, "No se pudo crear el rol.");
    }
  };

  public updateRole = async (
    req: Request<{ id: string }, {}, UpdateRoleBody>,
    res: Response,
  ) => {
    try {
      const role = await this.service.update(req.params.id, req.body);
      await recordAudit(req, {
        action: "role.update",
        entity: "role",
        entity_id: role.id,
        detail: `Actualizó el rol ${role.name}`,
      });
      return res.status(200).json(role);
    } catch (error) {
      return this.fail(res, error, "No se pudo actualizar el rol.");
    }
  };

  public deleteRole = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      await this.service.remove(req.params.id);
      return res.status(204).json();
    } catch (error) {
      return this.fail(res, error, "No se pudo eliminar el rol.");
    }
  };

  private fail(res: Response, error: unknown, fallback: string) {
    if (error instanceof RoleServiceError) {
      return res
        .status(error.statusCode)
        .json({ status: "error", message: error.message });
    }
    return res.status(400).json({ status: "error", message: fallback });
  }
}
