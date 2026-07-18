import type { AutomationRepository } from "../automation.repository.js";
import type { AutomationRunRepository } from "../automation.run.repository.js";
import type { Prisma } from "../../../generated/prisma/client";
import { buildContext, emptyContext } from "./context.js";
import { executeNode } from "./executors.js";
import {
  branchIdsFor,
  nextNodeId,
  nodeById,
  parseDefinition,
  triggerNode,
} from "./graph.js";
import { resolveWaitMs } from "./timing.js";
import { notify } from "../../Notifications/notification.helper.js";
import {
  emitAutomationUpdate,
  type RunDTO,
  type RunEventDTO,
} from "./events.js";
import type { EngineContext } from "./types.js";

const MAX_STEPS_PER_ADVANCE = 100;

// Vista mutable de la ejecución que se va emitiendo por SSE.
type Snapshot = {
  id: string;
  automation_id: string;
  contact_id: string | null;
  contact_name: string;
  status: RunDTO["status"];
  current_node_id: string | null;
  trigger: string;
  started_at: string;
  // Ya se notificó un fallo en esta pasada (evita saturar el feed).
  notifiedError?: boolean;
};

/**
 * Motor de ejecución: inscribe contactos y avanza cada ejecución nodo a nodo.
 * Los pasos inmediatos se ejecutan en cadena; un "esperar" suspende la
 * ejecución (WAITING + resume_at) hasta que el scheduler la despierta.
 */
export class AutomationEngine {
  // Enganche opcional para encadenar el disparador tag_added cuando un paso
  // "agregar etiqueta" aplica una etiqueta nueva (lo cablea el index del motor).
  private tagAddedHook: ((contactId: string, tag: string) => void) | null = null;

  constructor(
    private runRepo: AutomationRunRepository,
    private automationRepo: AutomationRepository,
  ) {}

  setTagAddedHook(hook: (contactId: string, tag: string) => void): void {
    this.tagAddedHook = hook;
  }

  // Inscribe un contacto (o un disparo anónimo) en un flujo activo y lo avanza.
  async enroll(input: {
    automationId: string;
    contactId: string | null;
    trigger: string;
    // Disparos manuales (Ejecutar) corren aunque el flujo esté pausado.
    force?: boolean;
  }): Promise<{ runId: string } | null> {
    const automation = await this.automationRepo.findById(input.automationId);
    if (!automation || (!automation.is_active && !input.force)) {
      return null;
    }
    const def = parseDefinition(automation.definition);
    const trigger = triggerNode(def);
    if (!trigger) {
      return null;
    }
    // Ajuste del flujo: permitir re-entrada (un contacto puede inscribirse
    // otra vez aunque ya esté recorriéndolo).
    const allowReentry = def.settings?.allow_reentry === true;
    // Evita reinscribir un contacto que ya está recorriendo este flujo,
    // salvo que el flujo permita re-entrada.
    if (input.contactId && !allowReentry) {
      const active = await this.runRepo.findActiveRun(
        input.automationId,
        input.contactId,
      );
      if (active) {
        return null;
      }
    }

    const ctx = await buildContext(this.runRepo, input.contactId);
    const run = await this.runRepo.createRun({
      automation_id: input.automationId,
      contact_id: input.contactId,
      trigger: input.trigger,
      current_node_id: trigger.id,
      context: ctx as unknown as Prisma.InputJsonValue,
    });

    const snapshot: Snapshot = {
      id: run.id,
      automation_id: run.automation_id,
      contact_id: run.contact_id,
      contact_name: ctx.contactName,
      status: "RUNNING",
      current_node_id: run.current_node_id,
      trigger: run.trigger,
      started_at: run.started_at.toISOString(),
    };
    this.emit(snapshot);

    await this.advance(run.id);
    return { runId: run.id };
  }

  // Reintenta una ejecución: "full" reinscribe al contacto en un run nuevo;
  // "failed" reejecuta en el sitio los pasos que fallaron.
  async retryRun(
    runId: string,
    mode: "full" | "failed",
  ): Promise<{ runId: string; retried?: number } | null> {
    const run = await this.runRepo.getRunWithEvents(runId);
    if (!run) {
      return null;
    }

    if (mode === "full") {
      const result = await this.enroll({
        automationId: run.automation_id,
        contactId: run.contact_id,
        trigger: "reintento",
        force: true,
      });
      return result;
    }

    // Reintento de pasos fallidos, en la misma ejecución.
    const automation = await this.automationRepo.findById(run.automation_id);
    if (!automation) {
      return null;
    }
    const def = parseDefinition(automation.definition);
    const ctx: EngineContext =
      (run.context as unknown as EngineContext) ?? emptyContext();
    const snapshot: Snapshot = {
      id: run.id,
      automation_id: run.automation_id,
      contact_id: run.contact_id,
      contact_name: ctx.contactName ?? "Contacto",
      status: run.status,
      current_node_id: run.current_node_id,
      trigger: run.trigger,
      started_at: run.started_at.toISOString(),
    };

    const failedNodeIds = [
      ...new Set(
        run.events
          .filter((event) => event.result === "ERROR" && event.node_id)
          .map((event) => event.node_id),
      ),
    ];

    let retried = 0;
    for (const nodeId of failedNodeIds) {
      const node = nodeById(def, nodeId);
      if (!node || node.data.kind === "wait") {
        continue;
      }
      const exec = await executeNode(node.data, ctx, this.runRepo);
      await this.log(
        snapshot,
        node.id,
        node.data.kind,
        exec.result,
        `Reintento: ${exec.detail}`,
      );
      retried += 1;
    }
    return { runId: run.id, retried };
  }

  // Avanza una ejecución tanto como sea posible en una sola pasada.
  async advance(runId: string): Promise<void> {
    const run = await this.runRepo.getRun(runId);
    if (!run) {
      return;
    }
    if (
      run.status === "COMPLETED" ||
      run.status === "EXITED" ||
      run.status === "FAILED"
    ) {
      return;
    }

    const automation = await this.automationRepo.findById(run.automation_id);
    if (!automation) {
      return;
    }
    const def = parseDefinition(automation.definition);
    const ctx: EngineContext =
      (run.context as unknown as EngineContext) ?? emptyContext();

    const snapshot: Snapshot = {
      id: run.id,
      automation_id: run.automation_id,
      contact_id: run.contact_id,
      contact_name: ctx.contactName ?? "Contacto",
      status: run.status,
      current_node_id: run.current_node_id,
      trigger: run.trigger,
      started_at: run.started_at.toISOString(),
    };

    let currentId: string | null;

    if (run.status === "WAITING") {
      const now = Date.now();
      if (run.resume_at && run.resume_at.getTime() > now) {
        return; // aún no vence la espera
      }
      const waitNode = run.current_node_id
        ? nodeById(def, run.current_node_id)
        : null;
      snapshot.status = "RUNNING";
      await this.runRepo.updateRun(run.id, {
        status: "RUNNING",
        resume_at: null,
      });
      await this.log(snapshot, waitNode?.id ?? "", "wait", "INFO", "Espera cumplida, continúa");
      currentId = run.current_node_id
        ? nextNodeId(def, run.current_node_id, "out")
        : null;
    } else {
      currentId = run.current_node_id ?? triggerNode(def)?.id ?? null;
    }

    let steps = 0;
    while (currentId) {
      if (++steps > MAX_STEPS_PER_ADVANCE) {
        await this.finalize(snapshot, "FAILED", "Se excedió el máximo de pasos (¿ciclo?).");
        return;
      }
      const node = nodeById(def, currentId);
      if (!node) {
        await this.finalize(snapshot, "COMPLETED", "Flujo finalizado");
        return;
      }

      // Paso "esperar": suspende la ejecución hasta resume_at.
      if (node.data.kind === "wait") {
        const ms = resolveWaitMs(node.data.amount, node.data.unit);
        const resumeAt = new Date(Date.now() + ms);
        snapshot.status = "WAITING";
        snapshot.current_node_id = node.id;
        await this.runRepo.updateRun(run.id, {
          status: "WAITING",
          current_node_id: node.id,
          resume_at: resumeAt,
          context: ctx as unknown as Prisma.InputJsonValue,
        });
        await this.log(
          snapshot,
          node.id,
          "wait",
          "INFO",
          `Espera iniciada (${node.data.amount ?? 1} ${node.data.unit ?? "días"})`,
        );
        return;
      }

      snapshot.current_node_id = node.id;
      await this.runRepo.updateRun(run.id, { current_node_id: node.id });
      const exec = await executeNode(node.data, ctx, this.runRepo);
      await this.log(snapshot, node.id, node.data.kind, exec.result, exec.detail);

      // Encadena el disparador tag_added si se aplicó una etiqueta nueva.
      if (
        node.data.kind === "add_tag" &&
        exec.result === "OK" &&
        exec.detail.includes("aplicada") &&
        ctx.contactId &&
        this.tagAddedHook
      ) {
        this.tagAddedHook(ctx.contactId, (node.data.tag ?? "").trim());
      }

      const nextId = nextNodeId(def, node.id, exec.branchId);
      if (!nextId) {
        // Una rama de condición/switch sin continuación = el contacto sale.
        const branching = branchIdsFor(node.data).length > 1;
        await this.finalize(
          snapshot,
          branching ? "EXITED" : "COMPLETED",
          branching ? "Salió por una rama sin continuación" : "Flujo finalizado",
        );
        return;
      }
      currentId = nextId;
    }

    await this.finalize(snapshot, "COMPLETED", "Flujo finalizado");
  }

  // --- helpers -----------------------------------------------------------

  private async finalize(
    snapshot: Snapshot,
    status: "COMPLETED" | "EXITED" | "FAILED",
    detail: string,
  ): Promise<void> {
    snapshot.status = status;
    await this.runRepo.updateRun(snapshot.id, {
      status,
      resume_at: null,
      current_node_id: snapshot.current_node_id,
    });
    await this.log(snapshot, snapshot.current_node_id ?? "", "", "INFO", detail);
  }

  private async log(
    snapshot: Snapshot,
    nodeId: string,
    kind: string,
    result: "OK" | "ERROR" | "INFO",
    detail: string,
  ): Promise<void> {
    const event = await this.runRepo.addEvent({
      run_id: snapshot.id,
      node_id: nodeId,
      kind,
      result,
      detail,
    });
    const eventDTO: RunEventDTO = {
      id: event.id,
      run_id: event.run_id,
      node_id: event.node_id,
      kind: event.kind,
      result: event.result,
      detail: event.detail,
      created_at: event.created_at.toISOString(),
    };
    this.emit(snapshot, eventDTO);

    // Un fallo notifica al equipo UNA sola vez por pasada (no por cada paso),
    // para no saturar el feed de notificaciones.
    if (result === "ERROR" && !snapshot.notifiedError) {
      snapshot.notifiedError = true;
      void notify({
        kind: "GENERAL",
        title: "Fallo en una automatización",
        body: `${snapshot.contact_name}: ${detail}`,
        entity_id: snapshot.automation_id,
      });
    }
  }

  private emit(snapshot: Snapshot, event?: RunEventDTO): void {
    const run: RunDTO = {
      id: snapshot.id,
      automation_id: snapshot.automation_id,
      contact_id: snapshot.contact_id,
      contact_name: snapshot.contact_name,
      status: snapshot.status,
      current_node_id: snapshot.current_node_id,
      trigger: snapshot.trigger,
      started_at: snapshot.started_at,
      updated_at: new Date().toISOString(),
    };
    emitAutomationUpdate({ automationId: snapshot.automation_id, run, event });
  }
}
