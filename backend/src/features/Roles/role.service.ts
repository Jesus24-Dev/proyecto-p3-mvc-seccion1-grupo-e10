import { Prisma } from "../../generated/prisma/client.js";
import { RoleRepository } from "./role.repository.js";
import type { CreateRoleBody, UpdateRoleBody } from "./role.schema.js";

export class RoleServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RoleServiceError";
  }
}

export class RoleService {
  constructor(private repository: RoleRepository) {}

  getAll() {
    return this.repository.findAll();
  }

  async create(body: CreateRoleBody) {
    try {
      return await this.repository.create(body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async update(id: string, body: UpdateRoleBody) {
    try {
      return await this.repository.update(id, body);
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(id: string) {
    const role = await this.repository.findById(id);
    if (!role) {
      throw new RoleServiceError("El rol no existe.", 404);
    }
    if (role.is_system) {
      throw new RoleServiceError(
        "Los roles base del sistema no se pueden eliminar.",
        400,
      );
    }
    await this.repository.delete(id);
  }

  private mapError(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return new RoleServiceError("Ya existe un rol con ese nombre.", 409);
      }
      if (e.code === "P2025") {
        return new RoleServiceError("El rol solicitado no existe.", 404);
      }
    }
    return e;
  }
}
