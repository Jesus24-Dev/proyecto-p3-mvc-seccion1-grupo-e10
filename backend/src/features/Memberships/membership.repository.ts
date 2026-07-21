import { prisma } from "../../database/prisma";
import type { CreateMembershipBody } from "./membership.schema";
import type { MembershipEntity } from "./membership.types";
import type { agency_role } from "../../generated/prisma/client";

const membershipSelect = {
  id: true,
  agency_id: true,
  user_id: true,
  role: true,
  created_at: true,
} as const;

export class MembershipRepository {
  async findAll(agencyId?: string): Promise<MembershipEntity[]> {
    return await prisma.agency_members.findMany({
      where: agencyId ? { agency_id: agencyId } : {},
      select: membershipSelect,
      orderBy: { created_at: "asc" },
    });
  }

  async findById(id: string): Promise<MembershipEntity | null> {
    return await prisma.agency_members.findUnique({
      where: { id: id },
      select: membershipSelect,
    });
  }

  async create(body: CreateMembershipBody): Promise<MembershipEntity> {
    return await prisma.agency_members.create({
      data: {
        agency_id: body.agency_id,
        user_id: body.user_id,
        ...(body.role ? { role: body.role } : {}),
      },
      select: membershipSelect,
    });
  }

  async updateRole(id: string, role: agency_role): Promise<MembershipEntity> {
    return await prisma.agency_members.update({
      where: { id: id },
      data: { role: role },
      select: membershipSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.agency_members.delete({
      where: { id: id },
    });
  }
}
