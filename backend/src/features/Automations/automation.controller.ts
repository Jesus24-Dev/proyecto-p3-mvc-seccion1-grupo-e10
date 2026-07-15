import type { Request, Response } from "express";
import {
  AutomationService,
  AutomationServiceError,
} from "./automation.service.js";
import type { AutomationResponse } from "./automation.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateAutomationBody } from "./automation.schema.js";

export class AutomationController {
    constructor(private automationService: AutomationService) {}

    public getAutomations = async (_req: Request, res: Response<AutomationResponse[]>) => {
        const automations = await this.automationService.getAllAutomations();
        return res.status(200).json(automations);
    }

    public getAutomationById = async (req: Request<{id: string}>, res: Response<AutomationResponse | ErrorResponse>) => {
        const {id} = req.params;
        const automation = await this.automationService.getAutomationById(id);

        if (automation) {
            return res.status(200).json(automation);
        } else {
            return res.status(404).json({"status": "error", "message": "La automatización solicitada no existe."})
        }
    }

    public createAutomation = async (req: Request<{}, {}, CreateAutomationBody>, res: Response<AutomationResponse | ErrorResponse>) => {
        try {
            const automation = await this.automationService.createAutomation(req.body);
            return res.status(201).json(automation);
        } catch (error) {
            return res.status(400).json({"status": "error", "message": error instanceof Error ? error.message : "No se pudo guardar la automatización. Revisa los datos enviados."})
        }
    }

    public updateAutomation = async (req: Request<{id: string}, {}, CreateAutomationBody>, res: Response<AutomationResponse | ErrorResponse>) => {
        try {
            const {id} = req.params;
            const automation = await this.automationService.updateAutomation(id, req.body);
            return res.status(200).json(automation);
        } catch (error) {
            if (error instanceof AutomationServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(400).json({"status": "error", "message": "No se pudo actualizar la automatización."})
        }
    }

    public deleteAutomation = async (req: Request<{id: string}, {}>, res: Response<ErrorResponse>) => {
        try {
            const {id} = req.params;
            await this.automationService.deleteAutomation(id);
            return res.status(204).json();
        } catch (error) {
            if (error instanceof AutomationServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(404).json({"status": "error", "message": "No se pudo eliminar la automatización."})
        }
    }
}
