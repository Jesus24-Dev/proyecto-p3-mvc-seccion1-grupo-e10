import { prisma } from "../../database/prisma";
import type { CreateAutomationBody } from "./automation.schema";
import type { AutomationEntity } from "./automation.types";
import type { Prisma } from "../../generated/prisma/client";

export class AutomationRepository {
  async findAll(): Promise<AutomationEntity[]> {
    return await prisma.automations.findMany({
      orderBy: { updated_at: "desc" },
    });
  }

  async findById(id: string): Promise<AutomationEntity | null> {
    return await prisma.automations.findUnique({
      where: { id: id },
    });
  }

  async create(body: CreateAutomationBody): Promise<AutomationEntity> {
    return await prisma.automations.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        is_active: body.is_active ?? false,
        definition: body.definition as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    id: string,
    body: CreateAutomationBody,
  ): Promise<AutomationEntity> {
    return await prisma.automations.update({
      where: { id: id },
      data: {
        name: body.name,
        description: body.description ?? "",
        is_active: body.is_active ?? false,
        definition: body.definition as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.automations.delete({
      where: { id: id },
    });
  }
}
