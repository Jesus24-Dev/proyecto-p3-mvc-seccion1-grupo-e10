import { prisma } from "../../database/prisma";
import type { CreateRoleBody, UpdateRoleBody } from "./role.schema.js";

const roleSelect = {
  id: true,
  name: true,
  description: true,
  permissions: true,
  is_system: true,
  created_at: true,
} as const;

export class RoleRepository {
  async findAll() {
    return await prisma.app_roles.findMany({
      select: roleSelect,
      orderBy: { created_at: "asc" },
    });
  }

  async create(body: CreateRoleBody) {
    return await prisma.app_roles.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        permissions: body.permissions ?? [],
      },
      select: roleSelect,
    });
  }

  async update(id: string, body: UpdateRoleBody) {
    return await prisma.app_roles.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.permissions !== undefined
          ? { permissions: body.permissions }
          : {}),
      },
      select: roleSelect,
    });
  }

  async delete(id: string) {
    await prisma.app_roles.delete({ where: { id } });
  }

  async findById(id: string) {
    return await prisma.app_roles.findUnique({
      where: { id },
      select: { id: true, is_system: true },
    });
  }
}
