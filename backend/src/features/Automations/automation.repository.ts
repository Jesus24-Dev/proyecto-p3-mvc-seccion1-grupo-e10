import { prisma } from "../../database/prisma";
import type { CreateAutomationBody } from "./automation.schema";
import type { AutomationEntity } from "./automation.types";
import type { Prisma } from "../../generated/prisma/client";
import type { AgencyScope } from "../Auth/agencyScope.js";

export class AutomationRepository {
  async findAll(scope?: AgencyScope): Promise<AutomationEntity[]> {
    return await prisma.automations.findMany({
      // Flujos de la subcuenta activa (o de todas en la vista agregada).
      where: scope && !scope.all ? { agency_id: { in: scope.ids } } : {},
      orderBy: { updated_at: "desc" },
    });
  }

  async findById(id: string): Promise<AutomationEntity | null> {
    return await prisma.automations.findUnique({
      where: { id: id },
    });
  }

  async create(
    body: CreateAutomationBody,
    agencyId?: string | null,
  ): Promise<AutomationEntity> {
    return await prisma.automations.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        folder: body.folder ?? "",
        is_active: body.is_active ?? false,
        definition: body.definition as Prisma.InputJsonValue,
        agency_id: agencyId ?? body.agency_id ?? null,
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
        folder: body.folder ?? "",
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
