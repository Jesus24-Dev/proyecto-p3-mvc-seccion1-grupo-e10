import {prisma} from "../../database/prisma";
import type { CreateAgencyBody } from "./agency.schema";
import type { AgencyEntity } from "./agency.types";

export class AgencyRepository {
    async findAll(): Promise<AgencyEntity[]>{
        return await prisma.agencies.findMany({
            select: {id: true, name: true, location: true, is_active: true}
        });
    }

    async findById(id: string): Promise<AgencyEntity | null>{
        return await prisma.agencies.findUnique({
            where: {id: id},
            select: {id: true, name: true, location: true, is_active: true}
        });
    }  

    async create(body: CreateAgencyBody): Promise<AgencyEntity | undefined>{
        return  await prisma.agencies.create({
            data: {
                name: body.name,
                location: body.location,
                is_active: body.is_active,
            }
        });    
    }
    async update(id: string, body: Omit<CreateAgencyBody, "id">): Promise<AgencyEntity>{
        return await prisma.agencies.update({
            where: {id: id},
            data: {
                name: body.name,
                location: body.location,
                is_active: body.is_active,
            }
        });
    }

    async delete(id: string): Promise<void>{
        await prisma.agencies.delete({
            where: {id: id}
        })
    }
}
