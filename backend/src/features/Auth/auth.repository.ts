import {prisma} from "../../database/prisma";
import {roles} from "../../generated/prisma/client.js"

export class AuthRepository {
    async findUserByEmail(email: string) {
        return prisma.users.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                email_verified: true,
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

    async findByVerificationToken(token: string) {
        return prisma.users.findUnique({
            where: { verification_token: token },
            select: {
                id: true,
                email: true,
                email_verified: true,
                verification_expires: true,
            },
        });
    }

    async markVerified(id: string) {
        await prisma.users.update({
            where: { id },
            data: {
                email_verified: true,
                verification_token: null,
                verification_expires: null,
            },
        });
    }

    async setVerificationToken(email: string, token: string, expires: Date) {
        return prisma.users.update({
            where: { email },
            data: {
                verification_token: token,
                verification_expires: expires,
            },
            select: { id: true, email: true, email_verified: true },
        });
    }
}
