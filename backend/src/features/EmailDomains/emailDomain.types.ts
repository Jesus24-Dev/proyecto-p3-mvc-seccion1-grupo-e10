import type {
  email_domains as PrismaEmailDomain,
  email_domain_status as EmailDomainStatus,
} from "../../generated/prisma/client";

export type EmailDomainEntity = PrismaEmailDomain;

export interface EmailDomainResponse {
  id: string;
  domain: string;
  status: EmailDomainStatus;
  agency_id: string;
  created_at: Date;
}
