import type {
  agency_members as PrismaAgencyMember,
  agency_role as AgencyRole,
} from "../../generated/prisma/client";

export type MembershipEntity = PrismaAgencyMember;

export interface MembershipResponse {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: Date;
}
