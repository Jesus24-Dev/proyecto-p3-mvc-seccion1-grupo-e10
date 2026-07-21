import {prisma} from "../../database/prisma";
import type { CreateAgencyBody } from "./agency.schema";
import type { AgencyEntity } from "./agency.types";
import type { AgencyScope } from "../Auth/agencyScope.js";

const agencySelect = {
    id: true,
    name: true,
    location: true,
    is_active: true,
    user_id: true,
    latitude: true,
    longitude: true,
    theme: true,
    dashboard_layout: true,
} as const;

export class AgencyRepository {
    async findAll(scope?: AgencyScope): Promise<AgencyEntity[]>{
        return await prisma.agencies.findMany({
            where: scope && !scope.all ? { id: { in: scope.ids } } : {},
            select: agencySelect,
        });
    }

    async findById(id: string): Promise<AgencyEntity | null>{
        return await prisma.agencies.findUnique({
            where: {id: id},
            select: agencySelect,
        });
    }

    async updateTheme(id: string, theme: unknown): Promise<AgencyEntity>{
        return await prisma.agencies.update({
            where: {id: id},
            data: {theme: theme as object},
            select: agencySelect,
        });
    }

    async updateDashboard(id: string, layout: unknown): Promise<AgencyEntity>{
        return await prisma.agencies.update({
            where: {id: id},
            data: {dashboard_layout: layout as object},
            select: agencySelect,
        });
    }

    async create(body: CreateAgencyBody): Promise<AgencyEntity | undefined>{
        return  await prisma.agencies.create({
            data: {
                name: body.name,
                location: body.location,
                is_active: true,
                user_id: body.user_id
            }
        });    
    }
    async update(id: string, body: Omit<CreateAgencyBody, "id">): Promise<AgencyEntity>{
        return await prisma.agencies.update({
            where: {id: id},
            data: {
                name: body.name,
                location: body.location,
                is_active: body.is_active ? body.is_active : true,
            }
        });
    }

    async delete(id: string): Promise<void>{
        await prisma.agencies.delete({
            where: {id: id}
        })
    }
}
