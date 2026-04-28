/*
model agencies {
  id String @id @default(uuid())
  name String
  location String
  is_active Boolean

  origin_orders orders[] @relation("OriginAgency")
  destination_orders orders[] @relation("DestinationAgency")
}
*/

import type { agencies as PrismaAgency } from "../../generated/prisma/client";

export type AgencyEntity = PrismaAgency

export interface AgencyResponse {
    id: string;
    name: string;
    location: string;
    is_active: boolean;
}