import {Prisma} from "../../generated/prisma/client.js";
import { UserInformationRepository } from "./userInformation.repository.js";
import type { CreateUserInformationBody } from "./userInformation.schema.js";

export class UserInformationService {
    constructor (private userInformationRepository: UserInformationRepository){}

    async getAllUsersInformation(){
        return await this.userInformationRepository.findAll();
    }

    async getUserInformationById(id: string){
        return await this.userInformationRepository.findById(id) 
    }

    async getUserInformationByUserId(user_id: string){
        return await this.userInformationRepository.findByUserId(user_id) 
    }

    async createUserInformation(body: CreateUserInformationBody){
        try {
            return await this.userInformationRepository.create(body);
        } catch (e){
            if (e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2002"){
                    throw new Error("Este usuario cuenta con datos registrados")
                }
            }
        }
    }

    async updateUserInformation(id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">){
        try {
            return await this.userInformationRepository.update(id, body);
        } catch (e){
            if (e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontró usuario con ID ${id}`)
                }
                if (e.code === "P2002"){
                    throw new Error("Este usuario cuenta con datos registrados")
                }
            }
        }
    }

    async updateUserInformationUsingUserId(user_id: string, body: Omit<CreateUserInformationBody, "id" | "user_id">){
        try {
            return await this.userInformationRepository.updateUsingUserId(user_id, body);
        } catch (e){
            if (e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontró usuario con ID ${user_id}`)
                }
                if (e.code === "P2002"){
                    throw new Error("Este usuario cuenta con datos registrados")
                }
            }
        }
    }

    async deleteUserInformation(id: string){
        try {
            await this.userInformationRepository.delete(id);
        } catch (e) {
            if(e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontró usuario con ID ${id}`)
                }
            }
        }
    }

    async deleteUserInformationUsingUserId(user_id: string){
        try {
            await this.userInformationRepository.deleteUsingUserId(user_id);
        } catch (e) {
            if(e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontró usuario con ID ${user_id}`)
                }
            }
        }
    }
}