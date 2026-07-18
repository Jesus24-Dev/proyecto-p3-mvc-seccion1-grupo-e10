import type {
  FlowDefinition,
  FlowEdge,
  FlowNode,
  StepData,
} from "./types.js";

// Interpreta la definición JSON del flujo (puede venir con cualquier forma).
export function parseDefinition(raw: unknown): FlowDefinition {
  const def = (raw ?? {}) as Partial<FlowDefinition>;
  const nodes = Array.isArray(def.nodes) ? (def.nodes as FlowNode[]) : [];
  const edges = Array.isArray(def.edges) ? (def.edges as FlowEdge[]) : [];
  return {
    nodes,
    edges,
    ...(def.variables ? { variables: def.variables } : {}),
    ...(def.settings ? { settings: def.settings } : {}),
  };
}

// Solo los nodos de paso (descarta las notas adhesivas).
export function stepNodes(def: FlowDefinition): FlowNode[] {
  return def.nodes.filter((node) => node.type !== "note" && node.data);
}

export function nodeById(def: FlowDefinition, id: string): FlowNode | null {
  return stepNodes(def).find((node) => node.id === id) ?? null;
}

// El disparador es el punto de entrada del flujo.
export function triggerNode(def: FlowDefinition): FlowNode | null {
  return stepNodes(def).find((node) => node.data?.kind === "trigger") ?? null;
}

// Salidas (handles de origen) de un nodo según su tipo. Réplica de
// `branchesFor` del editor para que el motor siga las mismas ramas.
export function branchIdsFor(data: StepData): string[] {
  if (data.kind === "condition") {
    return ["true", "false"];
  }
  if (data.kind === "switch") {
    const cases = (data.cases ?? [])
      .filter((item) => item.trim().length > 0)
      .map((item) => `case:${item}`);
    return [...cases, "default"];
  }
  return ["out"];
}

// Nodo siguiente al recorrer una salida concreta del nodo actual.
export function nextNodeId(
  def: FlowDefinition,
  nodeId: string,
  branchId: string,
): string | null {
  const edge = def.edges.find(
    (candidate) =>
      candidate.source === nodeId &&
      (candidate.sourceHandle ?? "out") === branchId,
  );
  return edge?.target ?? null;
}
