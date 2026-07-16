import type { Request, Response } from "express";
import {
  EmailDomainService,
  EmailDomainServiceError,
} from "./emailDomain.service.js";
import type { EmailDomainResponse } from "./emailDomain.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateEmailDomainBody } from "./emailDomain.schema.js";

export class EmailDomainController {
  constructor(private service: EmailDomainService) {}

  public getDomains = async (
    _req: Request,
    res: Response<EmailDomainResponse[]>,
  ) => {
    const domains = await this.service.getAll();
    return res.status(200).json(domains);
  };

  public createDomain = async (
    req: Request<{}, {}, CreateEmailDomainBody>,
    res: Response<EmailDomainResponse | ErrorResponse>,
  ) => {
    try {
      const domain = await this.service.create(req.body);
      return res.status(201).json(domain);
    } catch (error) {
      if (error instanceof EmailDomainServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res.status(400).json({
        status: "error",
        message: "No se pudo agregar el dominio. Revisa los datos enviados.",
      });
    }
  };

  public verifyDomain = async (
    req: Request<{ id: string }>,
    res: Response<EmailDomainResponse | ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      const domain = await this.service.verify(id);
      return res.status(200).json(domain);
    } catch (error) {
      if (error instanceof EmailDomainServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res
        .status(400)
        .json({ status: "error", message: "No se pudo verificar el dominio." });
    }
  };

  public deleteDomain = async (
    req: Request<{ id: string }>,
    res: Response<ErrorResponse>,
  ) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      return res.status(204).json();
    } catch (error) {
      if (error instanceof EmailDomainServiceError) {
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });
      }
      return res
        .status(404)
        .json({ status: "error", message: "No se pudo eliminar el dominio." });
    }
  };
}
