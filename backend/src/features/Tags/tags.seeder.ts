import { prisma } from "../../database/prisma";
import { tagSeedData } from "../../database/seeders/fixtures.js";

export async function seedTags() {
  const seeded = [];

  for (const tag of tagSeedData) {
    const agency = await prisma.agencies.findFirst({
      where: { name: tag.agencyName },
      select: { id: true },
    });

    if (!agency) {
      throw new Error(
        `Cannot seed tag ${tag.name}: missing agency ${tag.agencyName}.`,
      );
    }

    const record = await prisma.tags.upsert({
      where: {
        agency_id_name: { agency_id: agency.id, name: tag.name },
      },
      update: { color: tag.color },
      create: { name: tag.name, color: tag.color, agency_id: agency.id },
      select: { id: true, name: true, agency_id: true },
    });

    seeded.push(record);
  }

  return seeded;
}
