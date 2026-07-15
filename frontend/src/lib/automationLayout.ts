import type { Edge } from "@xyflow/react";
import type { StepNode } from "@/components/automations/StepNode";

/**
 * Distribución vertical automática estilo GHL: el disparador arriba y los
 * pasos hacia abajo; las ramas (condición / switch) se abren en columnas.
 * El lienzo es de solo lectura para arrastrar: la posición la calcula el
 * árbol, no el usuario.
 */
const NODE_WIDTH = 240;
const COL_GAP = 40;
const ROW_GAP = 150;
const COL_SPAN = NODE_WIDTH + COL_GAP;

type Structural = {
  id: string;
  data: StepNode["data"];
};

export function layoutTree(
  steps: Structural[],
  edges: Edge[],
): StepNode[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) {
      continue;
    }
    const list = childrenOf.get(edge.source) ?? [];
    list.push(edge.target);
    childrenOf.set(edge.source, list);
    hasParent.add(edge.target);
  }

  const root = steps.find((step) => !hasParent.has(step.id)) ?? steps[0];
  const xByRow: number[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const visiting = new Set<string>();

  // Recorrido en profundidad: cada hoja toma la siguiente columna libre de su
  // fila y cada padre se centra sobre sus hijos.
  function place(id: string, depth: number): number {
    if (visiting.has(id)) {
      // Evita ciclos: coloca en la siguiente columna disponible.
      const fallback = xByRow[depth] ?? 0;
      xByRow[depth] = fallback + 1;
      positions.set(id, { x: fallback * COL_SPAN, y: depth * ROW_GAP });
      return fallback;
    }
    visiting.add(id);

    const children = childrenOf.get(id) ?? [];
    let col: number;

    if (children.length === 0) {
      col = xByRow[depth] ?? 0;
      xByRow[depth] = col + 1;
    } else {
      const childCols = children.map((childId) => place(childId, depth + 1));
      col = (Math.min(...childCols) + Math.max(...childCols)) / 2;
      const rowNext = xByRow[depth] ?? 0;
      xByRow[depth] = Math.max(rowNext, Math.max(...childCols) + 1);
    }

    positions.set(id, { x: col * COL_SPAN, y: depth * ROW_GAP });
    visiting.delete(id);
    return col;
  }

  if (root) {
    place(root.id, 0);
  }

  // Cualquier nodo huérfano (sin conexión aún) se apila al final.
  let orphanRow = (xByRow[0] ?? 0) + 1;
  for (const step of steps) {
    if (!positions.has(step.id)) {
      positions.set(step.id, { x: orphanRow * COL_SPAN, y: 0 });
      orphanRow += 1;
    }
  }

  return steps.map((step) => ({
    id: step.id,
    type: "step" as const,
    position: positions.get(step.id) ?? { x: 0, y: 0 },
    data: step.data,
    draggable: false,
  }));
}
