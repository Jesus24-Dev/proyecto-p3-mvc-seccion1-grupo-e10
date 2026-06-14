/**
 * model users {
  id String @id @default(uuid())
  email String @unique
  password String
  role roles 
  
  customer_information customers_information?
  orders_by_user orders[]
}

enum roles {
  USER 
  ADMIN
  DISTRIBUTOR
}
 */

import { type users as PrismaUser, roles as PrismaRoles } from "../../generated/prisma/client";

export type UserEntity = Omit<PrismaUser, 'password'>

export interface UserResponse {
    id: string;
    email: string;
    role: PrismaRoles;
    is_active: boolean;
}

