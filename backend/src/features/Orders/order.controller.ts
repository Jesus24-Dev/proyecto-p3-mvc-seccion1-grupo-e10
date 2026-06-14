import type {Request, Response} from 'express';
import { OrderService } from './order.service';
import type { OrderResponse } from './order.types';
import type { ErrorResponse } from '../../shared/error.responses.types';
import type { CreateOrderBody } from './order.schema';

export class OrderController {
    constructor (private orderService: OrderService){}

    public getOrders = async (_req: Request, res: Response<OrderResponse[]>) => {
        const orders = await this.orderService.getAllOrders();
        return res.status(200).json(orders);
    }

    public getOrderById = async(req: Request<{id: string}>, res: Response<OrderResponse | ErrorResponse>) => {
        const {id} = req.params;
        const order = await this.orderService.getOrderById(id);

        if(order){
            return res.status(200).json(order);
        } else {
            return res.status(404).json({"status": "error", "message": "order not founded"})
        }       
    }

    public createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response<OrderResponse | ErrorResponse>) => {
        const body = req.body
        try {
            const order = await this.orderService.createOrder({
                user_id: body.user_id,
                package_received_at: body.package_received_at,
                package_delivered_at: body.package_delivered_at,
                origin_agency_id: body.origin_agency_id,
                destination_agency_id: body.destination_agency_id,
                description: body.description,
                amount: body.amount,
            });
            return res.status(201).json(order);
        } catch (error){
            return res.status(400).json({"status": "error", "message": error instanceof Error ? error.message : "An error occurred"})
        }
    }

    public updateOrder = async (req: Request<{id: string}, {}>, res: Response<OrderResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const order = await this.orderService.updateOrder(id, req.body);
            return res.status(200).json(order);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "Email already registered"})
        }
    }
    
    public deleteOrder = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.orderService.deleteOrder(id);
            return res.status(204).json();
        } catch (error){
            return res.status(404).json({"status": "error", "message": "order not founded"})
        }
    }
}