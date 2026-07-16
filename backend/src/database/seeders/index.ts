import { prisma } from "../prisma";
import { seedAgencies } from "../../features/Agencies/agency.seeder.js";
import { seedOrders } from "../../features/Orders/order.seeder.js";
import { seedPackages } from "../../features/Packages/package.seeder.js";
import { seedMemberships } from "../../features/Memberships/membership.seeder.js";
import { seedAutomations } from "../../features/Automations/automation.seeder.js";
import { seedTags } from "../../features/Tags/tags.seeder.js";
import { seedEmailTemplates } from "../../features/EmailTemplates/emailTemplate.seeder.js";
import { seedEmailDomains } from "../../features/EmailDomains/emailDomain.seeder.js";
import { seedUsers } from "../../features/Users/user.seeder.js";
import { seedUsersInformation } from "../../features/UsersInformation/userInformation.seeder.js";
import { seedPayments } from "../../features/Payments/payment.seeder.js";

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
  summary.push(await runSeeder("Memberships", seedMemberships));
  summary.push(await runSeeder("Automations", seedAutomations));
  summary.push(await runSeeder("Tags", seedTags));
  summary.push(await runSeeder("EmailDomains", seedEmailDomains));
  summary.push(await runSeeder("EmailTemplates", seedEmailTemplates));
  summary.push(await runSeeder("Payments", seedPayments));

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
