import type { Request, Response } from "express";
import {
  MembershipService,
  MembershipServiceError,
} from "./membership.service.js";
import type { MembershipResponse } from "./membership.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type {
  CreateMembershipBody,
  UpdateMembershipBody,
} from "./membership.schema.js";

export class MembershipController {
    constructor(private membershipService: MembershipService) {}

    public getMemberships = async (req: Request<{}, {}, {}, {agency_id?: string}>, res: Response<MembershipResponse[]>) => {
        const memberships = await this.membershipService.getAllMemberships(req.query.agency_id);
        return res.status(200).json(memberships);
    }

    public createMembership = async (req: Request<{}, {}, CreateMembershipBody>, res: Response<MembershipResponse | ErrorResponse>) => {
        try {
            const membership = await this.membershipService.createMembership(req.body);
            return res.status(201).json(membership);
        } catch (error) {
            if (error instanceof MembershipServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": "No se pudo agregar el miembro. Revisa los datos enviados."})
        }
    }

    public updateMembership = async (req: Request<{id: string}, {}, UpdateMembershipBody>, res: Response<MembershipResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const membership = await this.membershipService.updateMembershipRole(id, req.body);
            return res.status(200).json(membership);
        } catch (error) {
            if (error instanceof MembershipServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": "No se pudo actualizar el rol del miembro."})
        }
    }

    public deleteMembership = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.membershipService.deleteMembership(id);
            return res.status(204).json();
        } catch (error) {
            if (error instanceof MembershipServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(404).json({"status": "error", "message": "No se pudo eliminar la membresía."})
        }
    }
}
