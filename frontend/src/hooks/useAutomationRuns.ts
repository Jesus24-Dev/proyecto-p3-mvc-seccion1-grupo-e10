import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiRequestError, automationsApi } from "@/api";
import { useAuth } from "@/context/AuthContext";
import type {
  AutomationRun,
  AutomationRunEvent,
  AutomationStreamUpdate,
} from "@/types";

/** Agregados por nodo para pintar el lienzo en vivo. */
export type NodeStat = {
  /** Contactos parados aquí ahora mismo (ejecuciones vivas). */
  active: number;
  ok: number;
  error: number;
  /** Veces que un contacto pasó por el nodo (incluye eventos informativos). */
  visited: number;
  /** Último motivo de error registrado en el nodo, para mostrarlo en vivo. */
  lastError?: string;
};

export type NodeStats = Record<string, NodeStat>;

// Agregados por nodo desde una lista de ejecuciones: cuántos contactos hay
// parados en cada paso ahora y el acumulado ok/error del nodo.
export function computeNodeStats(runs: AutomationRun[]): NodeStats {
  const stats: NodeStats = {};
  const ensure = (id: string): NodeStat =>
    (stats[id] ??= { active: 0, ok: 0, error: 0, visited: 0 });

  for (const run of runs) {
    const live = run.status === "RUNNING" || run.status === "WAITING";
    if (live && run.current_node_id) {
      ensure(run.current_node_id).active += 1;
    }
    for (const event of run.events) {
      if (!event.node_id) {
        continue;
      }
      const stat = ensure(event.node_id);
      stat.visited += 1;
      if (event.result === "OK") {
        stat.ok += 1;
      } else if (event.result === "ERROR") {
        stat.error += 1;
        stat.lastError = event.detail;
      }
    }
  }
  return stats;
}

/**
 * Suscribe la ejecución en vivo de una automatización: carga el historial de
 * inscripciones y abre un stream SSE que actualiza cada ejecución nodo a nodo.
 * Es la primera capa en tiempo real del frontend, deliberadamente pequeña.
 */
export function useAutomationRuns(
  automationId: string | undefined,
  enabled: boolean,
) {
  const { expireSession } = useAuth();
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const runsRef = useRef<Map<string, AutomationRun>>(new Map());

  const commit = useCallback(() => {
    setRuns(
      [...runsRef.current.values()].sort((a, b) =>
        b.started_at.localeCompare(a.started_at),
      ),
    );
  }, []);

  const reload = useCallback(async () => {
    if (!automationId) {
      return;
    }
    try {
      const list = await automationsApi.runs(automationId);
      runsRef.current = new Map(list.map((run) => [run.id, run]));
      commit();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        expireSession(error.message);
      }
    }
  }, [automationId, commit, expireSession]);

  // Carga inicial del historial cuando se activa la vista en vivo.
  useEffect(() => {
    if (!enabled || !automationId) {
      return;
    }
    void reload();
  }, [enabled, automationId, reload]);

  // Stream SSE: fusiona cada actualización de ejecución y evento.
  useEffect(() => {
    if (!enabled || !automationId) {
      return;
    }
    const source = new EventSource(automationsApi.streamUrl(automationId));

    source.onopen = () => setIsConnected(true);
    source.onerror = () => setIsConnected(false);

    source.onmessage = (message) => {
      let update: AutomationStreamUpdate;
      try {
        update = JSON.parse(message.data) as AutomationStreamUpdate;
      } catch {
        return;
      }
      const existing = runsRef.current.get(update.run.id);
      const events: AutomationRunEvent[] = existing ? [...existing.events] : [];
      if (update.event && !events.some((e) => e.id === update.event!.id)) {
        events.push(update.event);
      }
      runsRef.current.set(update.run.id, { ...update.run, events });
      commit();
    };

    return () => {
      source.close();
      setIsConnected(false);
    };
  }, [enabled, automationId, commit]);

  // Agregados por nodo (para el lienzo en vivo).
  const nodeStats = useMemo<NodeStats>(() => computeNodeStats(runs), [runs]);

  return { runs, nodeStats, isConnected, reload };
}
