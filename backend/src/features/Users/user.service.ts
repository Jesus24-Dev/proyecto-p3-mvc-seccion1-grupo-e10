import { Prisma } from "../../generated/prisma/client";
import { UserRepository } from "./user.repository.js";
import { type CreateUserBody } from "./user.schema.js";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async getUserById(id: string) {
    return await this.userRepository.findById(id);
  }

  async createUser(body: CreateUserBody) {
    try {
      return await this.userRepository.create(body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new Error("El email ya se encuentra registrado");
        }
      }
    }
  }

  async updateUser(
    id: string,
    body: { email: string; password?: string; role?: CreateUserBody["role"] },
  ) {
    try {
      return await this.userRepository.update(id, body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró usuario con ID ${id}`);
        }
        if (e.code === "P2002") {
          throw new Error("El email ya se encuentra registrado");
        }
      }
    }
  }

  async deleteUser(id: string) {
    try {
      await this.userRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new Error(`No se encontró usuario con ID ${id}`);
        }
        if (e.code === "P2003") {
          throw new Error(
            "No se puede eliminar: el usuario tiene envíos o agencias propias.",
          );
        }
      }
      // No tragarse errores desconocidos (antes devolvía 204 en falso).
      throw e;
    }
  }
}
