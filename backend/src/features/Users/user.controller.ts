import type {Request, Response} from 'express';
import { UserService } from './user.service.js';
import type { UserResponse } from './user.types.js';
import type { ErrorResponse } from '../../shared/error.responses.types.js';

export class UserController {
    constructor (private userService: UserService){}

    public getUsers = async (_req: Request, res: Response<UserResponse[]>) => {
        const users = await this.userService.getAllUsers();
        return res.status(200).json(users);
    }

    public getUserById = async(req: Request<{id: string}>, res: Response<UserResponse | ErrorResponse>) => {
        const {id} = req.params;
        const user = await this.userService.getUserById(id);

        if(user){
            return res.status(200).json(user);
        } else {
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }       
    }

    public createUser = async (req: Request, res: Response<UserResponse | ErrorResponse>) => {
        try {
            const user = await this.userService.createUser(req.body);
            return res.status(201).json(user);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "Email already registered"})
        }
    }

    public updateUser = async (req: Request<{id: string}, {}>, res: Response<UserResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const user = await this.userService.updateUser(id, req.body);
            return res.status(200).json(user);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "Email already registered"})
        }
    }
    
    public deleteUser = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.userService.deleteUser(id);
            return res.status(204).json();
        } catch (error){
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }
    }
}