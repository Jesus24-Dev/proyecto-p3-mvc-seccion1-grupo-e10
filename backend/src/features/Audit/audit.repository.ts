import { prisma } from "../../database/prisma";

export interface AuditInput {
  user_id: string | null;
  user_email: string;
  action: string;
  entity: string;
  entity_id?: string | null;
  detail?: string;
}

const auditSelect = {
  id: true,
  action: true,
  entity: true,
  entity_id: true,
  detail: true,
  user_id: true,
  user_email: true,
  created_at: true,
} as const;

export class AuditRepository {
  async record(input: AuditInput) {
    return await prisma.audit_logs.create({
      data: {
        action: input.action,
        entity: input.entity,
        entity_id: input.entity_id ?? null,
        detail: input.detail ?? "",
        user_id: input.user_id,
        user_email: input.user_email,
      },
      select: auditSelect,
    });
  }

  async findAll() {
    return await prisma.audit_logs.findMany({
      select: auditSelect,
      orderBy: { created_at: "desc" },
      take: 500,
    });
  }
}
