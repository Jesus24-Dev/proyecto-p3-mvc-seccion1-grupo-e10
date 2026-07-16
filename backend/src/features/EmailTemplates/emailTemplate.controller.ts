import type { Request, Response } from "express";
import {
  EmailTemplateService,
  EmailTemplateServiceError,
} from "./emailTemplate.service.js";
import type { EmailTemplateResponse } from "./emailTemplate.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type {
  CreateEmailTemplateBody,
  UpdateEmailTemplateBody,
} from "./emailTemplate.schema.js";

export class EmailTemplateController {
  constructor(private service: EmailTemplateService) {}

  public getTemplates = async (
    _req: Request,
    res: Response<EmailTemplateResponse[]>,
  ) => {
    const templates = await this.service.getAll();
    return res.status(200).json(templates);
  };

  public createTemplate = async (
    req: Request<{}, {}, CreateEmailTemplateBody>,
    res: Response<EmailTemplateResponse | ErrorResponse>,
  ) => {
    try {
      const template = await this.service.create(req.body);
      return res.status(201).json(template);
    } catch (error) {
      if (error instanceof EmailTemplateServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(400).json({
        status: "error",
        message: "No se pudo crear la plantilla. Revisa los datos enviados.",
      });
    }
  };

  public updateTemplate = async (
    req: Request<{ id: string }, {}, UpdateEmailTemplateBody>,
    res: Response<EmailTemplateResponse | ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      const template = await this.service.update(id, req.body);
      return res.status(200).json(template);
    } catch (error) {
      if (error instanceof EmailTemplateServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(400).json({
        status: "error",
        message: "No se pudo actualizar la plantilla.",
      });
    }
  };

  public deleteTemplate = async (
    req: Request<{ id: string }, {}>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      return res.status(204).json();
    } catch (error) {
      if (error instanceof EmailTemplateServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(404).json({
        status: "error",
        message: "No se pudo eliminar la plantilla.",
      });
    }
  };
}
