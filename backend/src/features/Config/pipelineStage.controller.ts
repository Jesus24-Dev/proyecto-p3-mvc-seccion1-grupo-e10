import type { Request, Response } from "express";
import { PipelineStageRepository } from "./pipelineStage.repository.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type {
  CreateStageBody,
  UpdateStageBody,
  ReorderStagesBody,
} from "./pipelineStage.schema.js";
import { recordAudit } from "../Audit/audit.helper.js";

export class PipelineStageController {
  constructor(private repository: PipelineStageRepository) {}

  public list = async (_req: Request, res: Response) => {
    return res.status(200).json(await this.repository.findAll());
  };

  public create = async (
    req: Request<{}, {}, CreateStageBody>,
    res: Response,
  ) => {
    const stage = await this.repository.create({
      name: req.body.name.trim(),
      color: req.body.color?.trim() || "slate",
    });
    await recordAudit(req, {
      action: "stage.create",
      entity: "config",
      entity_id: stage.id,
      detail: `Creó la etapa logística "${stage.name}"`,
    });
    return res.status(201).json(stage);
  };

  public update = async (
    req: Request<{ id: string }, {}, UpdateStageBody>,
    res: Response<unknown | ErrorResponse>,
  ) => {
    const existing = await this.repository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: "error", message: "La etapa no existe." });
    }
    // Omite claves undefined (exactOptionalPropertyTypes).
    const stage = await this.repository.update(req.params.id, {
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.color !== undefined ? { color: req.body.color } : {}),
      ...(req.body.is_active !== undefined
        ? { is_active: req.body.is_active }
        : {}),
    });
    await recordAudit(req, {
      action: "stage.update",
      entity: "config",
      entity_id: stage.id,
      detail: `Actualizó la etapa logística "${stage.name}"`,
    });
    return res.status(200).json(stage);
  };

  public reorder = async (
    req: Request<{}, {}, ReorderStagesBody>,
    res: Response,
  ) => {
    const stages = await this.repository.reorder(req.body.ids);
    await recordAudit(req, {
      action: "stage.reorder",
      entity: "config",
      detail: "Reordenó las etapas logísticas",
    });
    return res.status(200).json(stages);
  };

  public remove = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse | Record<string, never>>,
  ) => {
    const existing = await this.repository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: "error", message: "La etapa no existe." });
    }
    if (existing.is_system) {
      return res.status(409).json({
        status: "error",
        message: "Las etapas del sistema no se pueden eliminar; puedes ocultarlas.",
      });
    }
    const count = await this.repository.countPackages(req.params.id);
    if (count > 0) {
      return res.status(409).json({
        status: "error",
        message: `La etapa tiene ${count} paquete(s). Muévelos antes de eliminarla.`,
      });
    }
    await this.repository.delete(req.params.id);
    await recordAudit(req, {
      action: "stage.delete",
      entity: "config",
      entity_id: req.params.id,
      detail: `Eliminó la etapa logística "${existing.name}"`,
    });
    return res.status(204).json({});
  };
}
