import type { Request, Response } from "express";
import { PackageService, PackageServiceError } from "./package.service.js";
import type { PackageResponse, TrackingResponse } from "./package.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { AddCheckpointBody, CreatePackageBody } from "./package.schema.js";
import { recordAudit } from "../Audit/audit.helper.js";

export class PackageController {
    constructor(private packageService: PackageService) {}

    public getPackages = async (_req: Request, res: Response<PackageResponse[]>) => {
        const packages = await this.packageService.getAllPackages();
        return res.status(200).json(packages);
    }

    public getPackageById = async (req: Request<{id: string}>, res: Response<PackageResponse | ErrorResponse>) => {
        const {id} = req.params;
        const foundPackage = await this.packageService.getPackageById(id);

        if (foundPackage) {
            return res.status(200).json(foundPackage);
        } else {
            return res.status(404).json({"status": "error", "message": "El paquete solicitado no existe."})
        }
    }

    public getPackageByTrackingCode = async (req: Request<{code: string}>, res: Response<TrackingResponse | ErrorResponse>) => {
        try {
            const {code} = req.params;
            const tracking = await this.packageService.getPackageByTrackingCode(code);
            return res.status(200).json(tracking);
        } catch (error) {
            if (error instanceof PackageServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(500).json({"status": "error", "message": "No se pudo obtener el rastreo del paquete."})
        }
    }

    public addCheckpoint = async (req: Request<{id: string}, {}, AddCheckpointBody>, res: Response<TrackingResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const tracking = await this.packageService.addCheckpoint(id, req.body);
            await recordAudit(req, {
                action: "package.status_change",
                entity: "package",
                entity_id: id,
                detail: `Cambió el estado del paquete ${tracking.tracking_code} a ${req.body.status}`,
            });
            return res.status(201).json(tracking);
        } catch (error) {
            if (error instanceof PackageServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": "No se pudo registrar el movimiento. Revisa los datos enviados."})
        }
    }

    public createPackage = async (req: Request<{}, {}, CreatePackageBody>, res: Response<PackageResponse | ErrorResponse>) => {
        try {
            const createdPackage = await this.packageService.createPackage(req.body);
            await recordAudit(req, {
                action: "package.create",
                entity: "package",
                entity_id: createdPackage.id,
                detail: `Registró el paquete ${createdPackage.tracking_code}`,
            });
            return res.status(201).json(createdPackage);
        } catch (error) {
            if (error instanceof PackageServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": error instanceof Error ? error.message : "No se pudo registrar el paquete. Revisa los datos enviados."})
        }
    }

    public updatePackage = async (req: Request<{id: string}, {}, CreatePackageBody>, res: Response<PackageResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const updatedPackage = await this.packageService.updatePackage(id, req.body);
            return res.status(200).json(updatedPackage);
        } catch (error) {
            if (error instanceof PackageServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": "No se pudo actualizar el paquete. Revisa los datos enviados."})
        }
    }

    public deletePackage = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.packageService.deletePackage(id);
            return res.status(204).json();
        } catch (error) {
            if (error instanceof PackageServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(404).json({"status": "error", "message": "No se pudo eliminar: el paquete no existe o ya fue eliminado."})
        }
    }
}
