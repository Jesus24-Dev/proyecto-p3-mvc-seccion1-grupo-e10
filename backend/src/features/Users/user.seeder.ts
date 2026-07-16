import bcrypt from "bcrypt";
import { prisma } from "../../database/prisma";
import { userSeedData } from "../../database/seeders/fixtures.js";

const SALT_ROUNDS = 10;

export async function seedUsers() {
  const seededUsers = [];

  for (const user of userSeedData) {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    const seededUser = await prisma.users.upsert({
      where: {
        email: user.email,
      },
      update: {
        password: hashedPassword,
        role: user.role,
        email_verified: true,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        role: user.role,
        email_verified: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    seededUsers.push(seededUser);
  }

  return seededUsers;
}
