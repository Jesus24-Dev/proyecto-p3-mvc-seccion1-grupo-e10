/**
 * 
 * model orders {
  id String @id @default(uuid())
  date_arrived DateTime
  date_received DateTime
  description String
  amount Float
  status transfer_status @default(CREATED)

  //Relation with user
  user_id String
  user users @relation(fields: [user_id], references: [id])
  
  //Relation with Agencies
  origin_agency_id String
  origin_agency agencies @relation("OriginAgency", fields: [origin_agency_id], references: [id])
  
  destination_agency_id String
  destination_agency agencies @relation("DestinationAgency", fields: [destination_agency_id], references: [id])
}
 */

import type {orders as PrismaOrder, transfer_status as TransferStatus} from "../../generated/prisma/client";
import type { Decimal } from "../../generated/prisma/internal/prismaNamespace";

export type OrderEntity = PrismaOrder;
export interface OrderResponse {
    id: string;
    user_id: string
    package_received_at: Date;
    package_delivered_at: Date;
    origin_agency_id: string;
    destination_agency_id: string
    description: string;
    amount: Decimal;
    status: TransferStatus
}

