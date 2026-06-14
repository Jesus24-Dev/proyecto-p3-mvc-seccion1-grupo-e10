import type { users as PrismaUser, roles as PrismaRole } from "../../generated/prisma/client.js";

export interface AuthUser {
  id: string;
  email: string;
  role: PrismaRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type UserEntity = PrismaUser;