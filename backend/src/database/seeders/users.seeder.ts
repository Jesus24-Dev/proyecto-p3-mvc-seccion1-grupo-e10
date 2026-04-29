import bcrypt from "bcrypt";
import { pathToFileURL } from "node:url";
import { roles } from "../../generated/prisma/enums";
import { prisma } from "../prisma";

const SALT_ROUNDS = 10;

const usersToSeed = [
    {
        email: "admin@drlogistics.local",
        password: "Admin123*",
        role: roles.ADMIN,
    },
    {
        email: "user@drlogistics.local",
        password: "User123*",
        role: roles.USER,
    },
    {
        email: "distributor@drlogistics.local",
        password: "Distributor123*",
        role: roles.DISTRIBUTOR,
    },
] as const;

export async function seedUsers() {
    const seededUsers = [];

    for (const user of usersToSeed) {
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

        const seededUser = await prisma.users.upsert({
            where: {
                email: user.email,
            },
            update: {
                password: hashedPassword,
                role: user.role,
            },
            create: {
                email: user.email,
                password: hashedPassword,
                role: user.role,
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

const isDirectExecution =
    process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
    seedUsers()
        .then((seededUsers) => {
            console.log(`Seeded ${seededUsers.length} users.`);
            console.table(seededUsers);
        })
        .catch((error: unknown) => {
            console.error("Failed to seed users.", error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}