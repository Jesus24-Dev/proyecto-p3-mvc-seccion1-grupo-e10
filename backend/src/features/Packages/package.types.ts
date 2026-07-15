import type {
  packages as PrismaPackage,
  package_status as PackageStatus,
} from "../../generated/prisma/client";

export type PackageEntity = PrismaPackage;

export interface PackageResponse {
  id: string;
  tracking_code: string;
  description: string;
  weight_kg: number;
  status: PackageStatus;
  created_at: Date;
  contact_id: string;
  order_id: string | null;
}
