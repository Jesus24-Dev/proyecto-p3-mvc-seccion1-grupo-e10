import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma";
import { type CreateUserBody } from "./user.schema.js";
import type { CreatedUser, UserEntity, UserResponse } from "./user.types.js";
import bcrypt from "bcrypt";

// 24 horas de validez para el enlace de verificación.
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class UserRepository {
  async findAll(): Promise<UserResponse[]> {
    return await prisma.users.findMany({
      select: { id: true, email: true, role: true },
    });
  }

  async findById(id: string): Promise<UserResponse | null> {
    return await prisma.users.findUnique({
      where: { id: id },
      select: { id: true, email: true, role: true },
    });
  }

  async create(body: CreateUserBody): Promise<CreatedUser> {
    // La cuenta nace sin verificar y con un token para el enlace de verificación.
    return await prisma.users.create({
      data: {
        email: body.email,
        password: await bcrypt.hash(body.password, 10),
        role: body.role,
        email_verified: false,
        verification_token: randomUUID(),
        verification_expires: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
      select: {
        id: true,
        email: true,
        role: true,
        verification_token: true,
      },
    });
  }

  async update(
    id: string,
    body: { email: string; password?: string },
  ): Promise<UserEntity> {
    // Si no llega una contraseña nueva, se conserva la actual.
    const data: { email: string; password?: string } = { email: body.email };

    if (body.password) {
      data.password = await bcrypt.hash(body.password, 10);
    }

    return await prisma.users.update({
      where: { id: id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.users.delete({
      where: { id: id },
    });
  }
}
