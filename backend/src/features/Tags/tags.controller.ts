import type { Request, Response } from "express";
import { TagService, TagServiceError } from "./tags.service.js";
import type { TagResponse } from "./tags.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateTagBody, UpdateTagBody } from "./tags.schema.js";

export class TagController {
  constructor(private tagService: TagService) {}

  public getTags = async (_req: Request, res: Response<TagResponse[]>) => {
    const tags = await this.tagService.getAllTags();
    return res.status(200).json(tags);
  };

  public createTag = async (
    req: Request<{}, {}, CreateTagBody>,
    res: Response<TagResponse | ErrorResponse>,
  ) => {
    try {
      const tag = await this.tagService.createTag(req.body);
      return res.status(201).json(tag);
    } catch (error) {
      if (error instanceof TagServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(400).json({
        status: "error",
        message: "No se pudo crear la etiqueta. Revisa los datos enviados.",
      });
    }
  };

  public updateTag = async (
    req: Request<{ id: string }, {}, UpdateTagBody>,
    res: Response<TagResponse | ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      const tag = await this.tagService.updateTag(id, req.body);
      return res.status(200).json(tag);
    } catch (error) {
      if (error instanceof TagServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(400).json({
        status: "error",
        message: "No se pudo actualizar la etiqueta.",
      });
    }
  };

  public deleteTag = async (
    req: Request<{ id: string }, {}>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      await this.tagService.deleteTag(id);
      return res.status(204).json();
    } catch (error) {
      if (error instanceof TagServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(404).json({
        status: "error",
        message: "No se pudo eliminar: la etiqueta no existe o ya fue eliminada.",
      });
    }
  };
}
