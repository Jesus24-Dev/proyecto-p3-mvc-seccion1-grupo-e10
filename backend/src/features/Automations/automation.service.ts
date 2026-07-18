import { Prisma } from "../../generated/prisma/client.js";
import { AutomationRepository } from "./automation.repository.js";
import type { CreateAutomationBody } from "./automation.schema.js";
import { engine } from "./engine/index.js";

export class AutomationServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AutomationServiceError";
  }
}

export class AutomationService {
  constructor(private automationRepository: AutomationRepository) {}

  async getAllAutomations() {
    return await this.automationRepository.findAll();
  }

  async getAutomationById(id: string) {
    return await this.automationRepository.findById(id);
  }

  async createAutomation(body: CreateAutomationBody) {
    return await this.automationRepository.create(body);
  }

  async updateAutomation(id: string, body: CreateAutomationBody) {
    try {
      return await this.automationRepository.update(id, body);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new AutomationServiceError(
            "La automatización solicitada no existe.",
            404,
          );
        }
      }
      throw e;
    }
  }

  /**
   * Dispara una automatización vía webhook: valida que exista y esté activa,
   * inscribe al contacto (si el payload trae `contact_id`) o un disparo
   * anónimo, y lo hace recorrer el flujo con el motor de ejecución real.
   */
  async triggerAutomation(id: string, payload: unknown) {
    const automation = await this.automationRepository.findById(id);

    if (!automation) {
      throw new AutomationServiceError(
        "La automatización solicitada no existe.",
        404,
      );
    }

    if (!automation.is_active) {
      throw new AutomationServiceError(
        "La automatización está pausada; actívala para poder dispararla.",
        409,
      );
    }

    const contactId =
      payload && typeof payload === "object" && "contact_id" in payload
        ? ((payload as { contact_id?: unknown }).contact_id as string) ?? null
        : null;

    const result = await engine.enroll({
      automationId: id,
      contactId: typeof contactId === "string" ? contactId : null,
      trigger: "webhook_received",
    });

    return {
      status: result ? ("running" as const) : ("skipped" as const),
      automation: { id: automation.id, name: automation.name },
      run_id: result?.runId ?? null,
      triggered_at: new Date().toISOString(),
    };
  }

  // Ejecución manual desde el editor ("Ejecutar"): corre aunque el flujo esté
  // pausado (es una prueba) e inscribe un contacto de muestra si no se indica.
  async runAutomation(id: string, contactId: string | null) {
    const automation = await this.automationRepository.findById(id);
    if (!automation) {
      throw new AutomationServiceError(
        "La automatización solicitada no existe.",
        404,
      );
    }
    const result = await engine.enroll({
      automationId: id,
      contactId,
      trigger: "manual",
      force: true,
    });
    if (!result) {
      throw new AutomationServiceError(
        "No se pudo inscribir: el flujo necesita un disparador, o el contacto ya está inscrito.",
        409,
      );
    }
    return { run_id: result.runId };
  }

  // Reintenta una ejecución (todo el flujo o solo los pasos fallidos).
  async retryRun(runId: string, mode: "full" | "failed") {
    const result = await engine.retryRun(runId, mode);
    if (!result) {
      throw new AutomationServiceError(
        "La ejecución no existe o no se pudo reintentar.",
        404,
      );
    }
    return { run_id: result.runId, retried: result.retried ?? null };
  }

  async deleteAutomation(id: string) {
    try {
      await this.automationRepository.delete(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001" || e.code === "P2025") {
          throw new AutomationServiceError(
            "No se pudo eliminar: la automatización no existe o ya fue eliminada.",
            404,
          );
        }
      }
      throw e;
    }
  }
}
