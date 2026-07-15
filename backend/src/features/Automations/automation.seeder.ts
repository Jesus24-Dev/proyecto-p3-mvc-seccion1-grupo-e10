import { prisma } from "../../database/prisma";
import { automationSeedData } from "../../database/seeders/fixtures.js";
import type { Prisma } from "../../generated/prisma/client";

export async function seedAutomations() {
  const seededAutomations = [];

  for (const automation of automationSeedData) {
    const existing = await prisma.automations.findFirst({
      where: { name: automation.name },
      select: { id: true },
    });

    const data = {
      name: automation.name,
      description: automation.description,
      is_active: automation.is_active,
      definition: automation.definition as Prisma.InputJsonValue,
    };

    const seededAutomation = existing
      ? await prisma.automations.update({
          where: { id: existing.id },
          data,
          select: { id: true, name: true },
        })
      : await prisma.automations.create({
          data,
          select: { id: true, name: true },
        });

    seededAutomations.push(seededAutomation);
  }

  return seededAutomations;
}
