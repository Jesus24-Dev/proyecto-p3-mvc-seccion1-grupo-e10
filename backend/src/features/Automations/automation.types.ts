import type { automations as PrismaAutomation } from "../../generated/prisma/client";

export type AutomationEntity = PrismaAutomation;

export interface AutomationResponse {
  id: string;
  name: string;
  description: string;
  folder: string;
  is_active: boolean;
  definition: unknown;
  created_at: Date;
  updated_at: Date;
}
