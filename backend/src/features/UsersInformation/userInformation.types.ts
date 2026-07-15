/*
model users_information {
  id String @id @default(uuid())
  first_name String
  last_name String
  address String
  birthday DateTime

  user_id String @unique
  user users @relation(fields: [user_id], references: [id])
}
*/

import type {users_information as PrismaUsersInformation} from "../../generated/prisma/client";

export type UsersInformationEntity = PrismaUsersInformation

export interface UserInformationResponse {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    address: string;
    birthday: Date;
    tags: string[];
}