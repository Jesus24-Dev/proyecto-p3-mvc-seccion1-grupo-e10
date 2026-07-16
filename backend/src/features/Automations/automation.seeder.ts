import { prisma } from "../../database/prisma";
import { automationSeedData } from "../../database/seeders/fixtures.js";
import type { Prisma } from "../../generated/prisma/client";

export async function seedAutomations() {
  const seededAutomations = [];

  for (const automation of automationSeedData) {
    const existing = await prisma.automations.findFirst({
      where: { name: automation.name },
      select: { id: true, name: true },
    });

    // Create-only: si el flujo ya existe, se respeta tal cual (conserva las
    // posiciones y ediciones que el usuario haya guardado; no lo sobreescribe).
    const seededAutomation =
      existing ??
      (await prisma.automations.create({
        data: {
          name: automation.name,
          description: automation.description,
          is_active: automation.is_active,
          definition: automation.definition as Prisma.InputJsonValue,
        },
        select: { id: true, name: true },
      }));

    seededAutomations.push(seededAutomation);
  }

  return seededAutomations;
}
