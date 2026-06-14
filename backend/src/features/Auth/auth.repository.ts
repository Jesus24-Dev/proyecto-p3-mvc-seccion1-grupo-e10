import {prisma} from "../../database/prisma";
import {roles} from "../../generated/prisma/client.js"
import type { UserEntity } from "./auth.types";

export class AuthRepository {
    async findUserByEmail(email: string): Promise<UserEntity | null> {
        return prisma.users.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                reset_token: true,
                reset_token_expires: true,
            },
        });
    }
    
    async createUser(email: string, hashedPassword: string, role: roles) {
        return prisma.users.create({
            data: {
                email,
                password: hashedPassword,
                role
            },
            select: {
                id: true,
                email: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });
    }

    async updatePassword(userId: string, newHashedPassword: string) {
        return prisma.users.update({
            where: { id: userId },
            data: { password: newHashedPassword },
        });
    }
}