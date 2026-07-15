import { prisma } from "../../database/prisma";
import { membershipSeedData } from "../../database/seeders/fixtures.js";

export async function seedMemberships() {
  const seededMemberships = [];

  for (const membership of membershipSeedData) {
    const [user, agency] = await Promise.all([
      prisma.users.findUnique({
        where: { email: membership.userEmail },
        select: { id: true },
      }),
      prisma.agencies.findFirst({
        where: { name: membership.agencyName },
        select: { id: true },
      }),
    ]);

    if (!user || !agency) {
      throw new Error(
        `Cannot seed membership: missing ${membership.userEmail} or ${membership.agencyName}.`,
      );
    }

    const seededMembership = await prisma.agency_members.upsert({
      where: {
        agency_id_user_id: { agency_id: agency.id, user_id: user.id },
      },
      update: { role: membership.role },
      create: {
        agency_id: agency.id,
        user_id: user.id,
        role: membership.role,
      },
      select: { id: true, role: true },
    });

    seededMemberships.push(seededMembership);
  }

  return seededMemberships;
}
