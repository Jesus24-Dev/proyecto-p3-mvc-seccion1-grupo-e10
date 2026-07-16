import { prisma } from "../../database/prisma";
import type { CreateTagBody, UpdateTagBody } from "./tags.schema";
import type { TagEntity } from "./tags.types";

const tagSelect = {
  id: true,
  name: true,
  color: true,
  agency_id: true,
  created_at: true,
  updated_at: true,
} as const;

export class TagRepository {
  async findAll(): Promise<TagEntity[]> {
    return await prisma.tags.findMany({
      select: tagSelect,
      orderBy: { name: "asc" },
    });
  }

  async create(body: CreateTagBody): Promise<TagEntity> {
    return await prisma.tags.create({
      data: {
        name: body.name,
        color: body.color ?? "",
        agency_id: body.agency_id,
      },
      select: tagSelect,
    });
  }

  async update(id: string, body: UpdateTagBody): Promise<TagEntity> {
    return await prisma.tags.update({
      where: { id: id },
      data: {
        name: body.name,
        color: body.color ?? "",
      },
      select: tagSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.tags.delete({
      where: { id: id },
    });
  }
}
