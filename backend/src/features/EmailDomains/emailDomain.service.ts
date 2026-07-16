import { Prisma } from "../../generated/prisma/client.js";
import { email_domain_status } from "../../generated/prisma/enums.js";
import { EmailDomainRepository } from "./emailDomain.repository.js";
import type { CreateEmailDomainBody } from "./emailDomain.schema.js";

export class EmailDomainServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "EmailDomainServiceError";
  }
}

export class EmailDomainService {
  constructor(private repository: EmailDomainRepository) {}

  async getAll() {
    return await this.repository.findAll();
  }

  async create(body: CreateEmailDomainBody) {
    try {
      return await this.repository.create(body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  /**
   * Marca el dominio como verificado. Nota: la verificación real por DNS está
   * fuera del alcance; aquí se simula el paso de PENDING a VERIFIED.
   */
  async verify(id: string) {
    try {
      return await this.repository.setStatus(id, email_domain_status.VERIFIED);
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
        return new EmailDomainServiceError(
          "Ese dominio ya está registrado en esta agencia.",
          409,
        );
      }
      if (e.code === "P2003") {
        return new EmailDomainServiceError(
          "La agencia indicada no existe.",
          400,
        );
      }
      if (e.code === "P2001" || e.code === "P2025") {
        return new EmailDomainServiceError(
          "El dominio solicitado no existe.",
          404,
        );
      }
    }
    return e;
  }
}
