import type { email_templates as PrismaEmailTemplate } from "../../generated/prisma/client";

export type EmailTemplateEntity = PrismaEmailTemplate;

export interface EmailTemplateResponse {
  id: string;
  name: string;
  subject: string;
  body: string;
  agency_id: string;
  created_at: Date;
  updated_at: Date;
}
