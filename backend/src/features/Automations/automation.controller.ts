import type { Request, Response } from "express";
import {
  AutomationService,
  AutomationServiceError,
} from "./automation.service.js";
import type { AutomationResponse } from "./automation.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";
import type { CreateAutomationBody } from "./automation.schema.js";
import type { RunAutomationBody } from "./run.schema.js";
import {
  runRepo,
  subscribeAutomationUpdates,
  type AutomationUpdate,
} from "./engine/index.js";

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

    public triggerAutomation = async (req: Request<{id: string}>, res: Response) => {
        try {
            const {id} = req.params;
            const result = await this.automationService.triggerAutomation(id, req.body);
            return res.status(202).json(result);
        } catch (error) {
            if (error instanceof AutomationServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(500).json({"status": "error", "message": "No se pudo disparar la automatización."})
        }
    }

    // Ejecución manual ("Ejecutar"): inscribe un contacto (o una muestra) y lo
    // hace recorrer el flujo en vivo.
    public runAutomation = async (req: Request<{id: string}, {}, RunAutomationBody>, res: Response) => {
        try {
            const {id} = req.params;
            let contactId = req.body?.contact_id ?? null;
            if (!contactId) {
                contactId = await runRepo.findSampleContactId();
            }
            const result = await this.automationService.runAutomation(id, contactId);
            return res.status(202).json(result);
        } catch (error) {
            if (error instanceof AutomationServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(500).json({"status": "error", "message": "No se pudo ejecutar la automatización."})
        }
    }

    // Ejecuciones (inscripciones) de un flujo con su registro, para las vistas
    // de historial y registros del editor.
    public listRuns = async (req: Request<{id: string}>, res: Response) => {
        const {id} = req.params;
        const runs = await runRepo.listRunsByAutomation(id);
        const payload = runs.map((run) => {
            const context = (run.context as { contactName?: string } | null) ?? null;
            const contactName = run.contact
                ? `${run.contact.first_name} ${run.contact.last_name}`.trim()
                : context?.contactName ?? "Contacto externo";
            return {
                id: run.id,
                automation_id: run.automation_id,
                contact_id: run.contact_id,
                contact_name: contactName,
                status: run.status,
                current_node_id: run.current_node_id,
                trigger: run.trigger,
                started_at: run.started_at.toISOString(),
                updated_at: run.updated_at.toISOString(),
                events: run.events.map((event) => ({
                    id: event.id,
                    run_id: event.run_id,
                    node_id: event.node_id,
                    kind: event.kind,
                    result: event.result,
                    detail: event.detail,
                    created_at: event.created_at.toISOString(),
                })),
            };
        });
        return res.status(200).json(payload);
    }

    // Reintenta una ejecución: full (reinscribe) o failed (repite fallidos).
    public retryRun = async (req: Request<{id: string, runId: string}, {}, {mode?: string}>, res: Response) => {
        try {
            const {runId} = req.params;
            const mode = req.body?.mode === "full" ? "full" : "failed";
            const result = await this.automationService.retryRun(runId, mode);
            return res.status(202).json(result);
        } catch (error) {
            if (error instanceof AutomationServiceError) {
                return res.status(error.statusCode).json({"status": "error", "message": error.message})
            }
            return res.status(500).json({"status": "error", "message": "No se pudo reintentar la ejecución."})
        }
    }

    // Inscripciones de un contacto en cualquier flujo, para su ficha.
    public listRunsByContact = async (req: Request<{contactId: string}>, res: Response) => {
        const {contactId} = req.params;
        const runs = await runRepo.listRunsByContact(contactId);
        const payload = runs.map((run) => ({
            id: run.id,
            automation_id: run.automation_id,
            automation_name: run.automation?.name ?? "Flujo",
            status: run.status,
            current_node_id: run.current_node_id,
            trigger: run.trigger,
            started_at: run.started_at.toISOString(),
            updated_at: run.updated_at.toISOString(),
            events: run.events.map((event) => ({
                id: event.id,
                run_id: event.run_id,
                node_id: event.node_id,
                kind: event.kind,
                result: event.result,
                detail: event.detail,
                created_at: event.created_at.toISOString(),
            })),
        }));
        return res.status(200).json(payload);
    }

    // Stream SSE: reenvía cada cambio de estado de las ejecuciones de este
    // flujo. Autenticado por ?token= (ver requireAdminQueryToken).
    public streamAutomation = (req: Request<{id: string}>, res: Response) => {
        const {id} = req.params;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        // Evita el buffering de proxies intermedios.
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();
        res.write("retry: 3000\n\n");

        const unsubscribe = subscribeAutomationUpdates((update: AutomationUpdate) => {
            if (update.automationId !== id) {
                return;
            }
            res.write(`data: ${JSON.stringify(update)}\n\n`);
        });

        // Ping periódico para mantener viva la conexión.
        const keepAlive = setInterval(() => res.write(": ping\n\n"), 25_000);

        req.on("close", () => {
            clearInterval(keepAlive);
            unsubscribe();
            res.end();
        });
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
