import { prisma } from "../../database/prisma";
import { emailTemplateSeedData } from "../../database/seeders/fixtures.js";

// Create-only: no sobreescribe plantillas ya existentes (respeta ediciones).
export async function seedEmailTemplates() {
  const seeded = [];

  for (const template of emailTemplateSeedData) {
    const agency = await prisma.agencies.findFirst({
      where: { name: template.agencyName },
      select: { id: true },
    });
    if (!agency) {
      throw new Error(
        `Cannot seed template ${template.name}: missing agency ${template.agencyName}.`,
      );
    }

    const existing = await prisma.email_templates.findFirst({
      where: { agency_id: agency.id, name: template.name },
      select: { id: true, name: true },
    });

    const record =
      existing ??
      (await prisma.email_templates.create({
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          agency_id: agency.id,
        },
        select: { id: true, name: true },
      }));

    seeded.push(record);
  }

  return seeded;
}
