import { prisma } from "../../database/prisma";
import { userInformationSeedData } from "../../database/seeders/fixtures.js";

export async function seedUsersInformation() {
  const ownerEmails = userInformationSeedData.map((item) => item.userEmail);
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
  const seededUserInformation = [];

  for (const item of userInformationSeedData) {
    const ownerId = ownerByEmail.get(item.userEmail);

    if (!ownerId) {
      throw new Error(
        `Cannot seed user information for ${item.userEmail}: missing user.`,
      );
    }

    const seededInformation = await prisma.users_information.upsert({
      where: {
        user_id: ownerId,
      },
      update: {
        first_name: item.first_name,
        last_name: item.last_name,
        document_id: item.document_id,
        phone: item.phone,
        address: item.address,
        birthday: item.birthday,
      },
      create: {
        user_id: ownerId,
        first_name: item.first_name,
        last_name: item.last_name,
        document_id: item.document_id,
        phone: item.phone,
        address: item.address,
        birthday: item.birthday,
      },
      select: {
        id: true,
        user_id: true,
        first_name: true,
        last_name: true,
        address: true,
        birthday: true,
      },
    });

    seededUserInformation.push(seededInformation);
  }

  return seededUserInformation;
}
