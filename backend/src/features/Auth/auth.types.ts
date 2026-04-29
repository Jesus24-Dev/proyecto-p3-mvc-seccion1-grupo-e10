import { type roles as PrismaRole } from "../../generated/prisma/client.js";

export interface AuthUser {
  id: string;
  email: string;
  role: PrismaRole;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}