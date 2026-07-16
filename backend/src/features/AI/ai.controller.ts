import type { Request, Response } from "express";
import { AiService, AiServiceError } from "./ai.service.js";
import type { AiPromptBody } from "./ai.schema.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";

export class AiController {
  constructor(private service: AiService) {}

  public generateEmail = async (
    req: Request<{}, {}, AiPromptBody>,
    res: Response<{ subject: string; body: string } | ErrorResponse>,
  ) => {
    try {
      const result = await this.service.generateEmail(req.body.prompt);
      return res.status(200).json(result);
    } catch (error) {
      return this.fail(res, error);
    }
  };

  public generateWorkflow = async (
    req: Request<{}, {}, AiPromptBody>,
    res: Response<unknown>,
  ) => {
    try {
      const result = await this.service.generateWorkflow(req.body.prompt);
      return res.status(200).json(result);
    } catch (error) {
      return this.fail(res, error);
    }
  };

  private fail(res: Response, error: unknown) {
    if (error instanceof AiServiceError) {
      return res
        .status(error.statusCode)
        .json({ status: "error", message: error.message });
    }
    return res.status(500).json({
      status: "error",
      message: "No se pudo generar el contenido con IA.",
    });
  }
}
