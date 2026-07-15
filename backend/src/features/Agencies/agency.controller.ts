import type {Request, Response} from 'express';
import { AgencyService } from './agency.service';
import type { AgencyResponse } from './agency.types';
import type { ErrorResponse } from '../../shared/error.responses.types';
import type { CreateAgencyBody } from './agency.schema';

export class AgencyController {
    constructor (private agencyService: AgencyService){}

    public getAgencies = async (_req: Request, res: Response<AgencyResponse[]>) => {
        const agencies = await this.agencyService.getAllAgencies();
        return res.status(200).json(agencies);
    }

    public getAgencyById = async(req: Request<{id: string}>, res: Response<AgencyResponse | ErrorResponse>) => {
        const {id} = req.params;
        const agency = await this.agencyService.getAgencyById(id);

        if(agency){
            return res.status(200).json(agency);
        } else {
            return res.status(404).json({"status": "error", "message": "La agencia solicitada no existe."})
        }
    }

    public createAgency = async (req: Request<{}, {}, CreateAgencyBody>, res: Response<AgencyResponse | ErrorResponse>) => {
        const body = req.body
        try {
            const agency = await this.agencyService.createAgency({
                name: body.name,
                location: body.location,
                is_active: true,
                user_id: body.user_id
            });
            return res.status(201).json(agency);
        } catch (error){
            return res.status(400).json({"status": "error", "message": error instanceof Error ? error.message : "No se pudo crear la agencia. Revisa los datos enviados."})
        }
    }

    public updateAgency = async (req: Request<{id: string}, {}>, res: Response<AgencyResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const agency = await this.agencyService.updateAgency(id, req.body);
            return res.status(200).json(agency);
        } catch (error){
            return res.status(400).json({"status": "error", "message": "No se pudo actualizar la agencia. Revisa los datos enviados."})
        }
    }
    
    public deleteAgency = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.agencyService.deleteAgency(id);
            return res.status(204).json();
        } catch (error){
            return res.status(404).json({"status": "error", "message": "No se pudo eliminar: la agencia no existe o ya fue eliminada."})
        }
    }
}