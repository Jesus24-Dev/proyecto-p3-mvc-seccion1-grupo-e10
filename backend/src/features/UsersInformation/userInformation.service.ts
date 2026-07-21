import { Prisma } from "../../generated/prisma/client.js";
import { UserInformationRepository } from "./userInformation.repository.js";
import type { CreateUserInformationBody } from "./userInformation.schema.js";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class UserInformationService {
  constructor(private userInformationRepository: UserInformationRepository) {}

  async getAllUsersInformation(scope?: AgencyScope) {
    return await this.userInformationRepository.findAll(scope);
  }

  async getUserInformationById(id: string) {
    return await this.userInformationRepository.findById(id);
  }

  async getUserInformationByUserId(user_id: string) {
    return await this.userInformationRepository.findByUserId(user_id);
  }

  async createUserInformation(body: CreateUserInformationBody) {
    try {
      // Con user_id: vincula a una cuenta existente. Sin él: contacto suelto
      // (el repositorio crea una cuenta de respaldo automáticamente).
      if (body.user_id) {
        return await this.userInformationRepository.create(body);
      }
      return await this.userInformationRepository.createStandalone(body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          // Choque de unicidad: el correo ya existe o la cuenta ya tiene ficha.
          throw new Error(
            "Ese correo ya está registrado. Usa otro para el contacto.",
          );
        }
      }
      throw e;
    }
  }

  async updateUserInformation(
    id: string,
    body: Omit<CreateUserInformationBody, "id" | "user_id">,
  ) {
    try {
      return await this.userInformationRepository.update(id, body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró usuario con ID ${id}`);
        }
        if (e.code === "P2002") {
          throw new Error("Este usuario cuenta con datos registrados");
        }
      }
    }
  }

  async updateUserInformationUsingUserId(
    user_id: string,
    body: Omit<CreateUserInformationBody, "id" | "user_id">,
  ) {
    try {
      return await this.userInformationRepository.updateUsingUserId(
        user_id,
        body,
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró usuario con ID ${user_id}`);
        }
        if (e.code === "P2002") {
          throw new Error("Este usuario cuenta con datos registrados");
        }
      }
    }
  }

  async addContactTag(id: string, tag: string) {
    return await this.userInformationRepository.addTag(id, tag);
  }

  async removeContactTag(id: string, tag: string) {
    return await this.userInformationRepository.removeTag(id, tag);
  }

  async deleteUserInformation(id: string) {
    try {
      await this.userInformationRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          throw new Error(`No se encontró usuario con ID ${id}`);
        }
      }
    }
  }

  async getTrashedContacts() {
    return await this.userInformationRepository.findTrashed();
  }

  async trashContactUsingUserId(user_id: string) {
    try {
      await this.userInformationRepository.trashUsingUserId(user_id);
    } catch (e) {
      if (e instanceof Error && e.message === "CONTACT_NOT_FOUND") {
        throw new Error(`No se encontró un contacto para el usuario ${user_id}`);
      }
      throw e;
    }
  }

  async restoreContactUsingUserId(user_id: string) {
    try {
      await this.userInformationRepository.restoreUsingUserId(user_id);
    } catch (e) {
      if (e instanceof Error && e.message === "CONTACT_NOT_FOUND") {
        throw new Error(`No se encontró un contacto para el usuario ${user_id}`);
      }
      throw e;
    }
  }

  async deleteUserInformationUsingUserId(user_id: string) {
    try {
      await this.userInformationRepository.deleteUsingUserId(user_id);
    } catch (e) {
      if (e instanceof Error && e.message === "CONTACT_NOT_FOUND") {
        throw new Error(`No se encontró un contacto para el usuario ${user_id}`);
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new Error(`No se encontró usuario con ID ${user_id}`);
        }
        if (e.code === "P2003") {
          throw new Error(
            "No se puede eliminar: el contacto tiene registros asociados.",
          );
        }
      }
      // Importante: no tragarse errores desconocidos (el bug original hacía
      // que el borrado "fallara en silencio" y el controlador respondiera 204).
      throw e;
    }
  }
}
