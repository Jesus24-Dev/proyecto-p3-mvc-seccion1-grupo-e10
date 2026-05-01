import { pathToFileURL } from "node:url";
import { prisma } from "../prisma";
import { seedUsers } from "../../features/Users/user.seeder.js";

export { seedUsers };

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