import { prisma } from "../prisma";
import { seedAgencies } from "../../features/Agencies/agency.seeder.js";
import { seedOrders } from "../../features/Orders/order.seeder.js";
import { seedPackages } from "../../features/Packages/package.seeder.js";
import { seedUsers } from "../../features/Users/user.seeder.js";
import { seedUsersInformation } from "../../features/UsersInformation/userInformation.seeder.js";

type SeedSummary = {
  feature: string;
  records: number;
};

async function runSeeder(feature: string, seed: () => Promise<unknown[]>) {
  const records = await seed();

  return {
    feature,
    records: records.length,
  } satisfies SeedSummary;
}

async function main() {
  const summary: SeedSummary[] = [];

  summary.push(await runSeeder("Users", seedUsers));
  summary.push(await runSeeder("Agencies", seedAgencies));
  summary.push(await runSeeder("UsersInformation", seedUsersInformation));
  summary.push(await runSeeder("Orders", seedOrders));
  summary.push(await runSeeder("Packages", seedPackages));

  console.log("Database seed completed successfully.");
  console.table(summary);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
