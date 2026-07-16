import { Prisma } from "../../generated/prisma/client.js";
import { EmailTemplateRepository } from "./emailTemplate.repository.js";
import type {
  CreateEmailTemplateBody,
  UpdateEmailTemplateBody,
} from "./emailTemplate.schema.js";

export class EmailTemplateServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "EmailTemplateServiceError";
  }
}

export class EmailTemplateService {
  constructor(private repository: EmailTemplateRepository) {}

  async getAll() {
    return await this.repository.findAll();
  }

  async create(body: CreateEmailTemplateBody) {
    try {
      return await this.repository.create(body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(id: string, body: UpdateEmailTemplateBody) {
    try {
      return await this.repository.update(id, body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async delete(id: string) {
    try {
      await this.repository.delete(id);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return new EmailTemplateServiceError(
          "Ya existe una plantilla con ese nombre en esta agencia.",
          409,
        );
      }
      if (e.code === "P2003") {
        return new EmailTemplateServiceError(
          "La agencia indicada no existe.",
          400,
        );
      }
      if (e.code === "P2001" || e.code === "P2025") {
        return new EmailTemplateServiceError(
          "La plantilla solicitada no existe.",
          404,
        );
      }
    }
    return e;
  }
}
