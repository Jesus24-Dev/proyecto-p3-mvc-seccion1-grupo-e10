import { prisma } from "../../database/prisma";
import { email_domain_status } from "../../generated/prisma/enums";
import type { CreateEmailDomainBody } from "./emailDomain.schema";
import type { EmailDomainEntity } from "./emailDomain.types";

const domainSelect = {
  id: true,
  domain: true,
  status: true,
  agency_id: true,
  created_at: true,
} as const;

export class EmailDomainRepository {
  async findAll(): Promise<EmailDomainEntity[]> {
    return await prisma.email_domains.findMany({
      select: domainSelect,
      orderBy: { domain: "asc" },
    });
  }

  async create(body: CreateEmailDomainBody): Promise<EmailDomainEntity> {
    return await prisma.email_domains.create({
      data: {
        domain: body.domain.toLowerCase(),
        agency_id: body.agency_id,
      },
      select: domainSelect,
    });
  }

  async setStatus(
    id: string,
    status: email_domain_status,
  ): Promise<EmailDomainEntity> {
    return await prisma.email_domains.update({
      where: { id: id },
      data: { status },
      select: domainSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.email_domains.delete({ where: { id: id } });
  }
}
