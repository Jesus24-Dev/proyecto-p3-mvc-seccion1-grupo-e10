import { EventEmitter } from "node:events";

// Bus en memoria: el motor emite cada cambio de estado y el endpoint SSE
// los reenvía a la interfaz. Un solo proceso, así que basta un EventEmitter.

export type RunDTO = {
  id: string;
  automation_id: string;
  contact_id: string | null;
  contact_name: string;
  status: string;
  current_node_id: string | null;
  trigger: string;
  started_at: string;
  updated_at: string;
};

export type RunEventDTO = {
  id: string;
  run_id: string;
  node_id: string;
  kind: string;
  result: string;
  detail: string;
  created_at: string;
};

export type AutomationUpdate = {
  automationId: string;
  run: RunDTO;
  event?: RunEventDTO | undefined;
};

const bus = new EventEmitter();
// Muchas pestañas pueden abrir el stream a la vez.
bus.setMaxListeners(0);

export function emitAutomationUpdate(update: AutomationUpdate): void {
  bus.emit("update", update);
}

export function subscribeAutomationUpdates(
  listener: (update: AutomationUpdate) => void,
): () => void {
  bus.on("update", listener);
  return () => bus.off("update", listener);
}
