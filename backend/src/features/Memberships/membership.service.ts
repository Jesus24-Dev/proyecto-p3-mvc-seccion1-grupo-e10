import { Prisma } from "../../generated/prisma/client.js";
import { MembershipRepository } from "./membership.repository.js";
import type {
  CreateMembershipBody,
  UpdateMembershipBody,
} from "./membership.schema.js";

export class MembershipServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "MembershipServiceError";
  }
}

export class MembershipService {
  constructor(private membershipRepository: MembershipRepository) {}

  async getAllMemberships(agencyId?: string) {
    return await this.membershipRepository.findAll(agencyId);
  }

  async createMembership(body: CreateMembershipBody) {
    try {
      return await this.membershipRepository.create(body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new MembershipServiceError(
            "El usuario ya es miembro de esta agencia.",
            409,
          );
        }
        if (e.code === "P2003") {
          throw new MembershipServiceError(
            "El usuario o la agencia indicada no existe.",
            400,
          );
        }
      }
      throw e;
    }
  }

  async updateMembershipRole(id: string, body: UpdateMembershipBody) {
    try {
      return await this.membershipRepository.updateRole(id, body.role);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new MembershipServiceError(
            "La membresía solicitada no existe.",
            404,
          );
        }
      }
      throw e;
    }
  }

  async deleteMembership(id: string) {
    try {
      await this.membershipRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new MembershipServiceError(
            "No se pudo eliminar: la membresía no existe o ya fue eliminada.",
            404,
          );
        }
      }
      throw e;
    }
  }
}
