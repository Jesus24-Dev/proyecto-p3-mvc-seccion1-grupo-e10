import { prisma } from "../../database/prisma";
import type { CreateSmartListBody } from "./smartList.schema";
import type { Prisma } from "../../generated/prisma/client";

export class SmartListRepository {
  async findAll() {
    return await prisma.smart_lists.findMany({ orderBy: { name: "asc" } });
  }

  async create(body: CreateSmartListBody) {
    return await prisma.smart_lists.create({
      data: {
        name: body.name,
        conditions: body.conditions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, body: CreateSmartListBody) {
    return await prisma.smart_lists.update({
      where: { id },
      data: {
        name: body.name,
        conditions: body.conditions as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string) {
    await prisma.smart_lists.delete({ where: { id } });
  }
}
