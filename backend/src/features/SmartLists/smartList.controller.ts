import type { Request, Response } from "express";
import {
  SmartListService,
  SmartListServiceError,
} from "./smartList.service.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateSmartListBody } from "./smartList.schema.js";

export class SmartListController {
  constructor(private smartListService: SmartListService) {}

  public getSmartLists = async (_req: Request, res: Response) => {
    const lists = await this.smartListService.getAll();
    return res.status(200).json(lists);
  };

  public createSmartList = async (
    req: Request<{}, {}, CreateSmartListBody>,
    res: Response,
  ) => {
    try {
      const list = await this.smartListService.create(req.body);
      return res.status(201).json(list);
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear la lista.",
      });
    }
  };

  public updateSmartList = async (
    req: Request<{ id: string }, {}, CreateSmartListBody>,
    res: Response<unknown | ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      const list = await this.smartListService.update(id, req.body);
      return res.status(200).json(list);
    } catch (error) {
      if (error instanceof SmartListServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res
        .status(400)
        .json({ status: "error", message: "No se pudo actualizar la lista." });
    }
  };

  public deleteSmartList = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      await this.smartListService.delete(id);
      return res.status(204).json();
    } catch (error) {
      if (error instanceof SmartListServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res
        .status(404)
        .json({ status: "error", message: "No se pudo eliminar la lista." });
    }
  };
}
