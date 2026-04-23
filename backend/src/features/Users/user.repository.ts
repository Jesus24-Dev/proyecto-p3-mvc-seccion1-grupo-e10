import {prisma} from "../../database/prisma";
import { type CreateUserBody } from "./user.schema.js";
import type { UserEntity } from "./user.types.js";

export class UserRepository {
    async findAll(): Promise<UserEntity[]>{
        return await prisma.users.findMany({
            select: {id: true, email: true, role: true}
        });
    }

    async findById(id: string): Promise<UserEntity | null>{
        return await prisma.users.findUnique({
            where: {id: id},
            select: {id: true, email: true, role: true}
        });
    }

    async create(body: CreateUserBody): Promise<UserEntity>{
        return await prisma.users.create({
            data: {
                email: body.email,
                password: body.password,
                role: body.role
            }
        });
    }

    async update(id: string, body: {email: string, password: string}): Promise<UserEntity>{
        return await prisma.users.update({
            where: {id: id},
            data: {
                email: body.email,
                password: body.password
            }
        });
    }

    async delete(id: string): Promise<void>{
        await prisma.users.delete({
            where: {id: id}
        })
    }
}
