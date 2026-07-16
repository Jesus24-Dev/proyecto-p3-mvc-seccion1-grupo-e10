import { Prisma } from "../../generated/prisma/client.js";
import { TagRepository } from "./tags.repository.js";
import type { CreateTagBody, UpdateTagBody } from "./tags.schema.js";

export class TagServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "TagServiceError";
  }
}

export class TagService {
  constructor(private tagRepository: TagRepository) {}

  async getAllTags() {
    return await this.tagRepository.findAll();
  }

  async createTag(body: CreateTagBody) {
    try {
      return await this.tagRepository.create(body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async updateTag(id: string, body: UpdateTagBody) {
    try {
      return await this.tagRepository.update(id, body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async deleteTag(id: string) {
    try {
      await this.tagRepository.delete(id);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  private mapError(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return new TagServiceError(
          "Ya existe una etiqueta con ese nombre en esta agencia.",
          409,
        );
      }
      if (e.code === "P2003") {
        return new TagServiceError("La agencia indicada no existe.", 400);
      }
      if (e.code === "P2001" || e.code === "P2025") {
        return new TagServiceError("La etiqueta solicitada no existe.", 404);
      }
    }
    return e;
  }
}
