import { Prisma } from "../../generated/prisma/client.js";
import { AutomationRepository } from "./automation.repository.js";
import type { CreateAutomationBody } from "./automation.schema.js";

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
   * Dispara una automatización vía webhook: valida que exista y esté
   * activa y devuelve el plan de ejecución simulado (el motor real de
   * flujos queda fuera del alcance de esta entrega).
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

    const definition = automation.definition as {
      nodes?: Array<{ data?: { kind?: string } }>;
    };
    const steps = (definition.nodes ?? [])
      .map((node) => node.data?.kind)
      .filter((kind): kind is string => Boolean(kind));

    return {
      status: "queued" as const,
      automation: { id: automation.id, name: automation.name },
      steps,
      received: payload ?? null,
      triggered_at: new Date().toISOString(),
    };
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
