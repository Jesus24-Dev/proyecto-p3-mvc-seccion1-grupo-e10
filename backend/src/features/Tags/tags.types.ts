import type { tags as PrismaTag } from "../../generated/prisma/client";

export type TagEntity = PrismaTag;

export interface TagResponse {
  id: string;
  name: string;
  color: string;
  agency_id: string;
  created_at: Date;
}
