import { Prisma } from "../../generated/prisma/client.js";
import { SmartListRepository } from "./smartList.repository.js";
import type { CreateSmartListBody } from "./smartList.schema.js";

export class SmartListServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SmartListServiceError";
  }
}

export class SmartListService {
  constructor(private repository: SmartListRepository) {}

  async getAll() {
    return await this.repository.findAll();
  }

  async create(body: CreateSmartListBody) {
    return await this.repository.create(body);
  }

  async update(id: string, body: CreateSmartListBody) {
    try {
      return await this.repository.update(id, body);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2025" || e.code === "P2001")
      ) {
        throw new SmartListServiceError("La lista no existe.", 404);
      }
      throw e;
    }
  }

  async delete(id: string) {
    try {
      await this.repository.delete(id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e.code === "P2025" || e.code === "P2001")
      ) {
        throw new SmartListServiceError("La lista no existe.", 404);
      }
      throw e;
    }
  }
}
