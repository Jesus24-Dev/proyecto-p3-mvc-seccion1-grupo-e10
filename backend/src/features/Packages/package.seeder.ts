import { prisma } from "../../database/prisma";
import { packageSeedData } from "../../database/seeders/fixtures.js";

export async function seedPackages() {
  const seededPackages = [];

  for (const seedPackage of packageSeedData) {
    const contact = await prisma.users_information.findFirst({
      where: { user: { email: seedPackage.contactUserEmail } },
      select: { id: true },
    });

    if (!contact) {
      throw new Error(
        `Cannot seed package ${seedPackage.tracking_code}: missing contact for ${seedPackage.contactUserEmail}.`,
      );
    }

    const order = seedPackage.orderDescription
      ? await prisma.orders.findFirst({
          where: { description: seedPackage.orderDescription },
          select: { id: true },
        })
      : null;

    const seededPackage = await prisma.packages.upsert({
      where: { tracking_code: seedPackage.tracking_code },
      update: {
        description: seedPackage.description,
        weight_kg: seedPackage.weight_kg,
        status: seedPackage.status,
        contact_id: contact.id,
        order_id: order?.id ?? null,
      },
      create: {
        tracking_code: seedPackage.tracking_code,
        description: seedPackage.description,
        weight_kg: seedPackage.weight_kg,
        status: seedPackage.status,
        contact_id: contact.id,
        order_id: order?.id ?? null,
      },
      select: {
        id: true,
        tracking_code: true,
        description: true,
        status: true,
      },
    });

    seededPackages.push(seededPackage);
  }

  return seededPackages;
}
