import { prisma } from "../../database/prisma";
import { agencySeedData } from "../../database/seeders/fixtures.js";

export async function seedAgencies() {
  const ownerEmails = agencySeedData.map((agency) => agency.userEmail);
  const owners = await prisma.users.findMany({
    where: {
      email: {
        in: ownerEmails,
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const ownerByEmail = new Map(owners.map((owner) => [owner.email, owner.id]));
  const seededAgencies = [];

  for (const agency of agencySeedData) {
    const ownerId = ownerByEmail.get(agency.userEmail);

    if (!ownerId) {
      throw new Error(
        `Cannot seed agency ${agency.name}: missing user ${agency.userEmail}.`,
      );
    }

    const existingAgency = await prisma.agencies.findFirst({
      where: {
        name: agency.name,
        location: agency.location,
        user_id: ownerId,
      },
      select: {
        id: true,
      },
    });

    const seededAgency = existingAgency
      ? await prisma.agencies.update({
          where: {
            id: existingAgency.id,
          },
          data: {
            is_active: agency.is_active,
          },
          select: {
            id: true,
            name: true,
            location: true,
            user_id: true,
          },
        })
      : await prisma.agencies.create({
          data: {
            name: agency.name,
            location: agency.location,
            is_active: agency.is_active,
            user_id: ownerId,
          },
          select: {
            id: true,
            name: true,
            location: true,
            user_id: true,
          },
        });

    seededAgencies.push(seededAgency);
  }

  return seededAgencies;
}
