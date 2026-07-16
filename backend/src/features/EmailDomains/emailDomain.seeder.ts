import { prisma } from "../../database/prisma";
import { email_domain_status } from "../../generated/prisma/enums";
import { emailDomainSeedData } from "../../database/seeders/fixtures.js";

// Create-only: no sobreescribe dominios ya existentes.
export async function seedEmailDomains() {
  const seeded = [];

  for (const entry of emailDomainSeedData) {
    const agency = await prisma.agencies.findFirst({
      where: { name: entry.agencyName },
      select: { id: true },
    });
    if (!agency) {
      throw new Error(
        `Cannot seed domain ${entry.domain}: missing agency ${entry.agencyName}.`,
      );
    }

    const existing = await prisma.email_domains.findFirst({
      where: { agency_id: agency.id, domain: entry.domain },
      select: { id: true, domain: true },
    });

    const record =
      existing ??
      (await prisma.email_domains.create({
        data: {
          domain: entry.domain,
          status:
            entry.status === "VERIFIED"
              ? email_domain_status.VERIFIED
              : email_domain_status.PENDING,
          agency_id: agency.id,
        },
        select: { id: true, domain: true },
      }));

    seeded.push(record);
  }

  return seeded;
}
