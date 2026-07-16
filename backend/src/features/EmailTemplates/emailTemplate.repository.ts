import { prisma } from "../../database/prisma";
import type {
  CreateEmailTemplateBody,
  UpdateEmailTemplateBody,
} from "./emailTemplate.schema";
import type { EmailTemplateEntity } from "./emailTemplate.types";

const templateSelect = {
  id: true,
  name: true,
  subject: true,
  body: true,
  agency_id: true,
  created_at: true,
  updated_at: true,
} as const;

export class EmailTemplateRepository {
  async findAll(): Promise<EmailTemplateEntity[]> {
    return await prisma.email_templates.findMany({
      select: templateSelect,
      orderBy: { name: "asc" },
    });
  }

  async create(body: CreateEmailTemplateBody): Promise<EmailTemplateEntity> {
    return await prisma.email_templates.create({
      data: {
        name: body.name,
        subject: body.subject ?? "",
        body: body.body ?? "",
        agency_id: body.agency_id,
      },
      select: templateSelect,
    });
  }

  async update(
    id: string,
    body: UpdateEmailTemplateBody,
  ): Promise<EmailTemplateEntity> {
    return await prisma.email_templates.update({
      where: { id: id },
      data: {
        name: body.name,
        subject: body.subject ?? "",
        body: body.body ?? "",
      },
      select: templateSelect,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.email_templates.delete({ where: { id: id } });
  }
}
