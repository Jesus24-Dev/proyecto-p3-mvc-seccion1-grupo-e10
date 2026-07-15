import {prisma} from "../../database/prisma";
import type { CreateUserInformationBody } from "./userInformation.schema.js";
import type { UsersInformationEntity } from "./userInformation.types.js";

export class UserInformationRepository{
    async findAll(): Promise<UsersInformationEntity[]>{
        return await prisma.users_information.findMany({
            select: {id: true, user_id: true, first_name: true, last_name: true, address: true, birthday: true, tags: true}
        });
    }

    async findById(id: string): Promise<UsersInformationEntity | null>{
        return await prisma.users_information.findUnique({
            where: {id: id},
            select: {id: true, user_id: true, first_name: true, last_name: true, address: true, birthday: true, tags: true}
        });
    }
    
    async findByUserId(userId: string): Promise<UsersInformationEntity | null>{
        return await prisma.users_information.findUnique({
            where: {user_id: userId},
            select: {id: true, user_id: true, first_name: true, last_name: true, address: true, birthday: true, tags: true}
        });
    }
    
    async create(body: CreateUserInformationBody): Promise<UsersInformationEntity | undefined>{
        return  await prisma.users_information.create({
            data: {
                user_id: body.user_id,
                first_name: body.first_name,
                last_name: body.last_name,
                address: body.address,
                birthday: new Date(body.birthday)
            }
        });    
    }
    
    async update(id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">): Promise<UsersInformationEntity>{
        return await prisma.users_information.update({
            where: {id: id},
            data: {
                first_name: body.first_name,
                last_name: body.last_name,
                address: body.address,
                birthday: new Date(body.birthday)
            }
        });
    }

    async updateUsingUserId(user_id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">): Promise<UsersInformationEntity>{
        return await prisma.users_information.update({
            where: {user_id: user_id},
            data: {
                first_name: body.first_name,
                last_name: body.last_name,
                address: body.address,
                birthday: new Date(body.birthday)
            }
        });
    }
    
    async delete(id: string): Promise<void>{
        await prisma.users_information.delete({
            where: {id: id}
        })
    }

    async deleteUsingUserId(user_id: string): Promise<void>{
        await prisma.users_information.delete({
            where: {user_id: user_id}
        })
    }
}