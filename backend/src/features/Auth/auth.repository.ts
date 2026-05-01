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
            },
        });
    }
}