import {Prisma} from "../../generated/prisma/client.js";
import { AgencyRepository } from "./agency.repository.js";
import type { CreateAgencyBody } from "./agency.schema.js";

export class AgencyService {
    constructor (private agencyRepository: AgencyRepository){}

    async getAllAgencies(){
        return await this.agencyRepository.findAll();
    }

    async getAgencyById(id: string){
        return await this.agencyRepository.findById(id) 
    }

    async createAgency(body: CreateAgencyBody){
        return await this.agencyRepository.create(body);
    }

    async updateAgency(id: string, body: CreateAgencyBody){
        try {
            return await this.agencyRepository.update(id, body);
        } catch (e){
            if (e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontro agencia con ID ${id}`)
                }
            }
        }
    }

    async deleteAgency(id: string){
        try {
            await this.agencyRepository.delete(id);
        } catch (e) {
            if(e instanceof Prisma.PrismaClientKnownRequestError){
                if (e.code === "P2001"){
                    throw new Error(`No se encontro agencia con ID ${id}`)
                }
            }
        }
    }
}