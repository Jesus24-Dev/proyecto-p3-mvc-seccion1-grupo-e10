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
    body: { email: string; password?: string; role?: UserEntity["role"] },
  ): Promise<UserEntity> {
    // Si no llega una contraseña nueva, se conserva la actual.
    const data: {
      email: string;
      password?: string;
      role?: UserEntity["role"];
    } = { email: body.email };

    if (body.password) {
      data.password = await bcrypt.hash(body.password, 10);
    }
    if (body.role) {
      data.role = body.role;
    }

    return await prisma.users.update({
      where: { id: id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    // Borra los datos CRM que dependen del usuario (ficha + paquetes + pagos)
    // para que la eliminación no falle por llaves foráneas. Si el usuario tiene
    // envíos o agencias propias, el DELETE final lanza P2003 (se traduce arriba).
    const info = await prisma.users_information.findUnique({
      where: { user_id: id },
      select: { id: true },
    });
    await prisma.$transaction(async (tx) => {
      if (info) {
        await tx.transactions.deleteMany({ where: { contact_id: info.id } });
        await tx.packages.deleteMany({ where: { contact_id: info.id } });
        // client_notes: Cascade · automation_runs: SetNull.
        await tx.users_information.delete({ where: { id: info.id } });
      }
      // agency_members: Cascade.
      await tx.users.delete({ where: { id: id } });
    });
  }
}
