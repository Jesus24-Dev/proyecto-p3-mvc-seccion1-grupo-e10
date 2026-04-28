import type {Request, Response} from 'express';
import { UserInformationService } from './userInformation.service.js';
import type { UserInformationResponse } from './userInformation.types.js';
import type { ErrorResponse } from '../../shared/error.responses.types.js';
import type { CreateUserInformationBody } from './userInformation.schema.js';

export class UserInformationController {
    constructor (private userInformationService: UserInformationService){}

    public getUsersInformation = async (_req: Request, res: Response<UserInformationResponse[]>) => {
        const usersInformation = await this.userInformationService.getAllUsersInformation();
        return res.status(200).json(usersInformation);
    }

    public getUserInformationById = async(req: Request<{id: string}>, res: Response<UserInformationResponse | ErrorResponse>) => {
        const {id} = req.params;
        const userInformation = await this.userInformationService.getUserInformationById(id);

        if(userInformation){
            return res.status(200).json(userInformation);
        } else {
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }       
    }

    public getUserInformationByUserId = async(req: Request<{user_id: string}>, res: Response<UserInformationResponse | ErrorResponse>) => {
        const {user_id} = req.params;
        const userInformation = await this.userInformationService.getUserInformationByUserId(user_id);

        if(userInformation){
            return res.status(200).json(userInformation);
        } else {
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }       
    }

    public createUserInformation = async (req: Request<{}, {}, CreateUserInformationBody>, res: Response<UserInformationResponse | ErrorResponse>) => {
        try {
            const userInformation = await this.userInformationService.createUserInformation(req.body);
            return res.status(201).json(userInformation);
        } catch (error){
            return res.status(400).json({"status": "error", "message": error instanceof Error ? error.message : "An error occurred"})
        }
    }

    public updateUserInformation = async (req: Request<{id: string}, {}, Omit<CreateUserInformationBody, "id" | "user_id">>, res: Response<UserInformationResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const user = await this.userInformationService.updateUserInformation(id, req.body);
            return res.status(200).json(user);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "Email already registered"})
        }
    }

    public updateUserInformationUsingUserId = async (req: Request<{user_id: string}, {}, Omit<CreateUserInformationBody, "id" | "user_id">>, res: Response<UserInformationResponse | ErrorResponse>) => {
        try {
            const {user_id} = req.params;
            const user = await this.userInformationService.updateUserInformationUsingUserId(user_id, req.body);
            return res.status(200).json(user);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "Email already registered"})
        }
    }
    
    public deleteUserInformation = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.userInformationService.deleteUserInformation(id);
            return res.status(204).json();
        } catch (error){
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }
    }

    public deleteUserInformationUsingUserId = async (req: Request<{user_id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {user_id} = req.params;
            await this.userInformationService.deleteUserInformationUsingUserId(user_id);
            return res.status(204).json();
        } catch (error){
            return res.status(404).json({"status": "error", "message": "User not founded"})
        }
    }
}