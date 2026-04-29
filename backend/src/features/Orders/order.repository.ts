import {prisma} from "../../database/prisma";
import type { CreateOrderBody } from "./order.schema";
import type { OrderEntity } from "./order.types";

export class OrderRepository {
    async findAll(): Promise<OrderEntity[]>{
        return await prisma.orders.findMany({
            select: {
                id: true, 
                user_id: true, 
                date_arrived: true,
                date_received: true,
                origin_agency_id: true,
                destination_agency_id: true,
                description: true,
                amount: true,
                status: true
            }
        });
    }

    async findById(id: string): Promise<OrderEntity | null>{
        return await prisma.orders.findUnique({
            where: {id: id},
            select: {
                id: true, 
                user_id: true, 
                date_arrived: true,
                date_received: true,
                origin_agency_id: true,
                destination_agency_id: true,
                description: true,
                amount: true,
                status: true
            }
        });
    }

    async create(body: CreateOrderBody): Promise<OrderEntity>{
        return await prisma.orders.create({
            data: {
                user_id: body.user_id,
                date_arrived: new Date(body.date_arrived),
                date_received: new Date(body.date_received),
                origin_agency_id: body.origin_agency_id,
                destination_agency_id: body.destination_agency_id,
                description: body.description,
                amount: body.amount,
            }
        });
    }

    async update(id: string, body: CreateOrderBody): Promise<OrderEntity>{
        return await prisma.orders.update({
            where: {id: id},
            data: {
                user_id: body.user_id,
                date_arrived: new Date(body.date_arrived),
                date_received: new Date(body.date_received),
                origin_agency_id: body.origin_agency_id,
                destination_agency_id: body.destination_agency_id,
                description: body.description,
                amount: body.amount,
            }
        });
    }

    async delete(id: string): Promise<void>{
        await prisma.orders.delete({
            where: {id: id}
        })
    }
}
