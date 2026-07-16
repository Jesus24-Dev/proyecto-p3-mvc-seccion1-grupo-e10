import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Braces,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import {
  aiApi,
  ApiRequestError,
  automationsApi,
  emailDomainsApi,
  emailTemplatesApi,
  tagsApi,
} from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler } from "@/hooks/usePageData";
import {
  AUTOMATION_VARIABLES,
  BRANCH_FIELDS,
  CONDITION_OPERATORS,
  DEFAULT_NOTE_COLOR,
  NODE_COLORS,
  NOTE_COLORS,
  STEP_META,
  TRIGGER_OPTIONS,
  WAIT_UNITS,
  branchesFor,
  defaultDataFor,
  mergeVariables,
  normalizeVariableToken,
  type AutomationVariable,
  type StepData,
  type StepKind,
} from "@/lib/automationSteps";
import { layoutTree } from "@/lib/automationLayout";
import { StepNodeComponent, type StepNode } from "@/components/automations/StepNode";
import { DeletableEdge } from "@/components/automations/DeletableEdge";
import {
  NoteNodeComponent,
  type NoteNode,
} from "@/components/automations/NoteNode";
import { VariableTextarea } from "@/components/automations/VariableTextarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AI_BUTTON_CLASS, cn } from "@/lib/utils";
import type {
  AutomationDefinition,
  EmailDomain,
  EmailTemplate,
} from "@/types";

const nodeTypes = { step: StepNodeComponent, note: NoteNodeComponent };
const edgeTypes = { deletable: DeletableEdge };

type EditorNode = StepNode | NoteNode;

const WEBHOOK_METHODS = [
  { value: "POST", label: "POST" },
  { value: "GET", label: "GET" },
] as const;

// Catálogo de acciones del panel derecho, agrupado como en un builder real.
const ACTION_CATALOG: Array<{ group: string; kinds: StepKind[] }> = [
  {
    group: "Mensajería",
    kinds: ["send_whatsapp", "send_instagram", "send_messenger", "send_email"],
  },
  { group: "Contacto", kinds: ["add_tag"] },
  { group: "Lógica", kinds: ["wait", "condition", "switch"] },
  { group: "Integraciones", kinds: ["send_webhook"] },
];

type Step = { id: string; data: StepData };
type Note = { id: string; text: string; color: string };
type Insertion = { nodeId: string; branchId: string };

/** Texto plano de un cuerpo HTML, para vistas compactas. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const initialSteps: Step[] = [{ id: "trigger", data: defaultDataFor("trigger") }];

function newId(): string {
  return `n${Date.now().toString(36)}${Math.floor(performance.now())
    .toString(36)
    .slice(-3)}`;
}

export function AutomationEditorPage() {
  const { automationId } = useParams();
  const isNew = !automationId || automationId === "new";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { expireSession } = useAuth();
  const runMutation = useMutationHandler();

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [name, setName] = useState("Nueva automatización");
  const [folder, setFolder] = useState(searchParams.get("folder") ?? "");
  const [folderOptions, setFolderOptions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Insertion | null>(null);
  const [actionQuery, setActionQuery] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [customVariables, setCustomVariables] = useState<string[]>([]);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Ajustes globales del flujo (aplican a todos los pasos).
  const [flowSettings, setFlowSettings] = useState<{
    email_from_domain: string;
    whatsapp_from: string;
  }>({ email_from_domain: "", whatsapp_from: "" });
  const { activeAgencyId } = useActiveAgency();
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);

  // Recursos de la subcuenta activa: etiquetas (sugerencias), plantillas de
  // correo y dominios verificados (para el paso "Enviar email").
  useEffect(() => {
    let cancelled = false;
    const scoped = <T extends { agency_id: string }>(items: T[]) =>
      items.filter((item) => !activeAgencyId || item.agency_id === activeAgencyId);

    Promise.all([tagsApi.list(), emailTemplatesApi.list(), emailDomainsApi.list()])
      .then(([tags, templates, domains]) => {
        if (cancelled) {
          return;
        }
        setTagOptions([...new Set(scoped(tags).map((tag) => tag.name))]);
        setEmailTemplates(scoped(templates));
        setEmailDomains(scoped(domains));
      })
      .catch(() => {
        if (!cancelled) {
          setTagOptions([]);
          setEmailTemplates([]);
          setEmailDomains([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeAgencyId]);

  // Variables integradas + personalizadas, para el picker de los textareas.
  const variableList = useMemo(
    () => mergeVariables(customVariables),
    [customVariables],
  );

  // Aristas válidas: descarta las que apuntan a ramas ya inexistentes
  // (p. ej. un caso de switch eliminado) o a nodos borrados.
  const validEdges = useMemo(() => {
    const stepById = new Map(steps.map((step) => [step.id, step]));
    return edges.filter((edge) => {
      const source = stepById.get(edge.source);
      if (!source || !stepById.has(edge.target)) {
        return false;
      }
      const branchIds = branchesFor(source.data).map((branch) => branch.id);
      return !edge.sourceHandle || branchIds.includes(edge.sourceHandle);
    });
  }, [steps, edges]);

  // Posiciones que el usuario movió a mano (o cargadas de una automatización
  // guardada); tienen prioridad sobre el auto-layout.
  const savedPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const rfInstanceRef = useRef<ReactFlowInstance<EditorNode, Edge> | null>(null);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<EditorNode>([]);

  // Firma estructural: cambia al agregar/quitar pasos, reconectar o al
  // agregar/quitar notas (que se dibujan como nodos flotantes aparte).
  const structureSig = useMemo(
    () =>
      steps.map((s) => s.id).join(",") +
      "|" +
      validEdges
        .map((e) => `${e.source}>${e.sourceHandle ?? ""}>${e.target}`)
        .join(",") +
      "|" +
      notes.map((n) => n.id).join(","),
    [steps, validEdges, notes],
  );

  // Recalcula el árbol al cambiar la estructura, preservando posiciones ya
  // conocidas (movidas a mano o guardadas) y ubicando solo los nodos nuevos.
  // Las notas se añaden como nodos flotantes, fuera del auto-layout.
  useEffect(() => {
    const laid = layoutTree(steps, validEdges);
    setRfNodes((prev) => {
      const prevPos = new Map(prev.map((node) => [node.id, node.position]));
      const stepNodes: EditorNode[] = laid.map((node) => ({
        ...node,
        draggable: true,
        position:
          savedPositions.current.get(node.id) ??
          prevPos.get(node.id) ??
          node.position,
      }));
      const noteNodes: EditorNode[] = notes.map((note) => ({
        id: note.id,
        type: "note" as const,
        draggable: true,
        position:
          savedPositions.current.get(note.id) ??
          prevPos.get(note.id) ?? { x: 0, y: 0 },
        data: { text: note.text, color: note.color },
      }));
      return [...stepNodes, ...noteNodes];
    });
    // structureSig resume steps + validEdges + notes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureSig, setRfNodes]);

  // Mantiene el contenido del nodo al día cuando cambia su configuración,
  // sin tocar su posición (pasos y notas).
  useEffect(() => {
    setRfNodes((prev) =>
      prev.map((node) => {
        if (node.type === "note") {
          const note = notes.find((n) => n.id === node.id);
          return note
            ? { ...node, data: { text: note.text, color: note.color } }
            : node;
        }
        const step = steps.find((s) => s.id === node.id);
        return step ? { ...node, data: step.data } : node;
      }),
    );
  }, [steps, notes, setRfNodes]);

  const flowEdges = useMemo(
    () =>
      validEdges.map((edge) => ({
        ...edge,
        type: "deletable",
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    [validEdges],
  );

  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedId) ?? null,
    [steps, selectedId],
  );

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  useEffect(() => {
    // Sugerencias de carpeta a partir de las automatizaciones existentes.
    automationsApi
      .list()
      .then((list) => {
        const folders = [
          ...new Set(list.map((item) => item.folder).filter(Boolean)),
        ];
        setFolderOptions(folders);
      })
      .catch(() => setFolderOptions([]));
  }, []);

  useEffect(() => {
    if (isNew) {
      return;
    }
    let cancelled = false;

    automationsApi
      .get(automationId!)
      .then((automation) => {
        if (cancelled) {
          return;
        }
        setName(automation.name);
        setFolder(automation.folder ?? "");
        setIsActive(automation.is_active);
        const loadedNodes = automation.definition
          .nodes as unknown as EditorNode[];
        // Recupera las posiciones guardadas para respetarlas al re-dibujar.
        for (const node of loadedNodes) {
          if (node.position) {
            savedPositions.current.set(node.id, node.position);
          }
        }
        // Separa los pasos del flujo de las notas adhesivas.
        const stepNodes = loadedNodes.filter(
          (node) => node.type !== "note",
        ) as StepNode[];
        const noteNodes = loadedNodes.filter(
          (node) => node.type === "note",
        ) as NoteNode[];
        setSteps(stepNodes.map((node) => ({ id: node.id, data: node.data })));
        setNotes(
          noteNodes.map((node) => ({
            id: node.id,
            text: node.data?.text ?? "",
            color: node.data?.color ?? DEFAULT_NOTE_COLOR,
          })),
        );
        setEdges(automation.definition.edges as unknown as Edge[]);
        const loadedVariables = (
          automation.definition as unknown as { variables?: unknown }
        ).variables;
        if (Array.isArray(loadedVariables)) {
          setCustomVariables(
            loadedVariables.filter(
              (item): item is string => typeof item === "string",
            ),
          );
        }
        const loadedSettings = automation.definition.settings;
        if (loadedSettings) {
          setFlowSettings({
            email_from_domain: loadedSettings.email_from_domain ?? "",
            whatsapp_from: loadedSettings.whatsapp_from ?? "",
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (
          error instanceof ApiRequestError &&
          (error.statusCode === 401 || error.statusCode === 403)
        ) {
          expireSession(error.message);
          return;
        }
        setNotice({
          text:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la automatización.",
          tone: "danger",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [automationId, isNew, expireSession]);

  // El "+" de cada nodo/rama pide insertar un paso: guarda el objetivo y
  // deja el panel derecho en modo catálogo.
  useEffect(() => {
    function onAddStep(event: Event) {
      const detail = (event as CustomEvent<Insertion>).detail;
      setPending(detail);
      setSelectedId(null);
    }
    function onDeleteEdge(event: Event) {
      const { edgeId } = (event as CustomEvent<{ edgeId: string }>).detail;
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    }
    window.addEventListener("automation:add-step", onAddStep);
    window.addEventListener("automation:delete-edge", onDeleteEdge);
    return () => {
      window.removeEventListener("automation:add-step", onAddStep);
      window.removeEventListener("automation:delete-edge", onDeleteEdge);
    };
  }, []);

  function updateSelected(patch: Partial<StepData>) {
    if (!selectedId) {
      return;
    }
    setSteps((current) =>
      current.map((step) =>
        step.id === selectedId
          ? { ...step, data: { ...step.data, ...patch } }
          : step,
      ),
    );
  }

  /** Inserta un paso conectado al objetivo pendiente (o al final del flujo). */
  function addStep(kind: StepKind) {
    const target =
      pending ??
      (() => {
        // Sin objetivo explícito: engancha al primer nodo sin salida.
        const withOutgoing = new Set(validEdges.map((edge) => edge.source));
        const leaf =
          [...steps].reverse().find((step) => !withOutgoing.has(step.id)) ??
          steps[steps.length - 1];
        const branch = branchesFor(leaf.data)[0];
        return { nodeId: leaf.id, branchId: branch.id };
      })();

    const id = newId();
    const newData = defaultDataFor(kind);
    // Handle de paso del nuevo nodo (para insertar "entre" dos pasos).
    const passHandle = branchesFor(newData)[0].id;
    const sourceHandle =
      target.branchId === "out" ? undefined : target.branchId;

    setSteps((current) => [...current, { id, data: newData }]);
    setEdges((current) => {
      // ¿La salida elegida ya alimentaba un hijo? Entonces insertamos en medio:
      // origen → nuevo → hijo previo.
      const existing = current.find(
        (edge) =>
          edge.source === target.nodeId &&
          (edge.sourceHandle ?? "out") === target.branchId,
      );

      const rest = current.filter((edge) => edge !== existing);
      const inserted: Edge[] = [
        { id: `e${id}`, source: target.nodeId, target: id, sourceHandle },
      ];

      if (existing) {
        inserted.push({
          id: `e${id}-c`,
          source: id,
          target: existing.target,
          sourceHandle: passHandle === "out" ? undefined : passHandle,
        });
      }

      return [...rest, ...inserted];
    });
    setPending(null);
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedStep || selectedStep.data.kind === "trigger") {
      return;
    }
    setSteps((current) => current.filter((step) => step.id !== selectedId));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== selectedId && edge.target !== selectedId,
      ),
    );
    setSelectedId(null);
  }

  /** Elimina un paso por id (los disparadores no se pueden borrar). */
  function deleteStep(nodeId: string) {
    const step = steps.find((item) => item.id === nodeId);
    if (!step || step.data.kind === "trigger") {
      return;
    }
    setSteps((current) => current.filter((item) => item.id !== nodeId));
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    );
    setSelectedId((current) => (current === nodeId ? null : current));
  }

  /** Duplica un paso, insertándolo justo después del original en el flujo. */
  function duplicateStep(nodeId: string) {
    const original = steps.find((item) => item.id === nodeId);
    if (!original || original.data.kind === "trigger") {
      return;
    }
    const id = newId();
    const clone: StepData = {
      ...original.data,
      ...(original.data.cases ? { cases: [...original.data.cases] } : {}),
      label: original.data.label
        ? `${original.data.label} (copia)`
        : original.data.label,
    };
    const targetBranch = branchesFor(original.data)[0].id;
    const passHandle = branchesFor(clone)[0].id;
    const sourceHandle = targetBranch === "out" ? undefined : targetBranch;

    setSteps((current) => [...current, { id, data: clone }]);
    setEdges((current) => {
      const existing = current.find(
        (edge) =>
          edge.source === nodeId &&
          (edge.sourceHandle ?? "out") === targetBranch,
      );
      const rest = current.filter((edge) => edge !== existing);
      const inserted: Edge[] = [
        { id: `e${id}`, source: nodeId, target: id, sourceHandle },
      ];
      if (existing) {
        inserted.push({
          id: `e${id}-c`,
          source: id,
          target: existing.target,
          sourceHandle: passHandle === "out" ? undefined : passHandle,
        });
      }
      return [...rest, ...inserted];
    });
    setPending(null);
    setSelectedId(id);
  }

  // Genera una automatización a partir de una descripción (IA).
  async function generateWorkflowWithAi() {
    if (!aiPrompt.trim()) {
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const failure = await runMutation(async () => {
      const result = await aiApi.workflow(aiPrompt.trim());
      const nodes = result.definition.nodes as unknown as StepNode[];
      for (const node of nodes) {
        if (node.position) {
          savedPositions.current.set(node.id, node.position);
        }
      }
      setName(result.name || name);
      setSteps(nodes.map((node) => ({ id: node.id, data: node.data })));
      setEdges(result.definition.edges as unknown as Edge[]);
      setNotes([]);
      setSelectedId(null);
      setPending(null);
    });
    setAiLoading(false);
    if (failure) {
      setAiError(failure);
      return;
    }
    setAiOpen(false);
    setAiPrompt("");
  }

  // Conecta dos nodos arrastrando entre sus puntos (handles).
  // Crea un paso suelto (sin conexión) en la posición donde se soltó; el
  // usuario lo conecta arrastrando entre los puntos.
  function addOrphanStep(kind: StepKind, position: { x: number; y: number }) {
    const id = newId();
    savedPositions.current.set(id, position);
    setSteps((current) => [...current, { id, data: defaultDataFor(kind) }]);
    setPending(null);
    setSelectedId(id);
  }

  function onCanvasDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onCanvasDrop(event: React.DragEvent) {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/x-step-kind");
    if (!kind || !(kind in STEP_META) || kind === "trigger") {
      return;
    }
    const instance = rfInstanceRef.current;
    const position = instance
      ? instance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: 0, y: 0 };
    addOrphanStep(kind as StepKind, position);
  }

  const onConnect = useCallback((connection: Connection) => {
    const { source, target } = connection;
    if (!source || !target || source === target) {
      return;
    }
    setEdges((current) => {
      const sourceHandle = connection.sourceHandle ?? undefined;
      // Ignora un enlace idéntico (mismo origen/salida → mismo destino).
      const duplicate = current.some(
        (edge) =>
          edge.source === source &&
          (edge.sourceHandle ?? "") === (sourceHandle ?? "") &&
          edge.target === target,
      );
      if (duplicate) {
        return current;
      }
      return [
        ...current,
        {
          id: `e${newId()}`,
          source,
          target,
          sourceHandle,
          targetHandle: connection.targetHandle ?? undefined,
        },
      ];
    });
  }, []);

  // Acciones desde la barra flotante del nodo (editar/duplicar/eliminar).
  // Se re-registran al cambiar los pasos para que los handlers vean el estado
  // actual del lienzo.
  useEffect(() => {
    function onEdit(event: Event) {
      const { nodeId } = (event as CustomEvent<{ nodeId: string }>).detail;
      setSelectedId(nodeId);
      setPending(null);
    }
    function onDuplicate(event: Event) {
      duplicateStep((event as CustomEvent<{ nodeId: string }>).detail.nodeId);
    }
    function onDelete(event: Event) {
      deleteStep((event as CustomEvent<{ nodeId: string }>).detail.nodeId);
    }
    window.addEventListener("automation:edit-step", onEdit);
    window.addEventListener("automation:duplicate-step", onDuplicate);
    window.addEventListener("automation:delete-step", onDelete);
    return () => {
      window.removeEventListener("automation:edit-step", onEdit);
      window.removeEventListener("automation:duplicate-step", onDuplicate);
      window.removeEventListener("automation:delete-step", onDelete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  function updateSwitchCase(index: number, value: string) {
    const cases = [...(selectedStep?.data.cases ?? [])];
    cases[index] = value;
    updateSelected({ cases });
  }

  /** Crea una nota flotante y la deja seleccionada para editarla. */
  function addNote() {
    const id = newId();
    // Coloca la nota a la derecha del flujo, apilando las siguientes.
    savedPositions.current.set(id, { x: 360, y: 40 + notes.length * 48 });
    setNotes((current) => [...current, { id, text: "", color: DEFAULT_NOTE_COLOR }]);
    setPending(null);
    setSelectedId(id);
  }

  function updateNote(id: string, patch: Partial<Omit<Note, "id">>) {
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, ...patch } : note)),
    );
  }

  function removeNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id));
    savedPositions.current.delete(id);
    setSelectedId((current) => (current === id ? null : current));
  }

  function addVariable(raw: string) {
    const token = normalizeVariableToken(raw);
    if (!token) {
      return;
    }
    const builtin = AUTOMATION_VARIABLES.some((v) => v.token === token);
    setCustomVariables((current) =>
      builtin || current.includes(token) ? current : [...current, token],
    );
  }

  function removeVariable(token: string) {
    setCustomVariables((current) => current.filter((item) => item !== token));
  }

  async function handleSave() {
    setIsSaving(true);
    setNotice(null);

    const positionById = new Map(
      rfNodes.map((node) => [node.id, node.position]),
    );
    const stepNodes = steps.map((step) => ({
      id: step.id,
      type: "step",
      position: positionById.get(step.id) ?? { x: 0, y: 0 },
      data: step.data,
    }));
    const noteNodes = notes.map((note) => ({
      id: note.id,
      type: "note",
      position: positionById.get(note.id) ?? { x: 0, y: 0 },
      data: { text: note.text, color: note.color },
    }));
    const definition: AutomationDefinition = {
      nodes: [...stepNodes, ...noteNodes] as unknown as AutomationDefinition["nodes"],
      edges: validEdges as unknown as AutomationDefinition["edges"],
      variables: customVariables,
      settings: {
        email_from_domain: flowSettings.email_from_domain,
        whatsapp_from: flowSettings.whatsapp_from,
      },
    };

    const failure = await runMutation(async () => {
      const payload = {
        name,
        folder: folder.trim() || undefined,
        is_active: isActive,
        definition,
      };
      if (isNew) {
        const created = await automationsApi.create(payload);
        navigate(`/admin/automations/editor/${created.id}`, { replace: true });
      } else {
        await automationsApi.update(automationId!, payload);
      }
    });

    setIsSaving(false);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Automatización guardada correctamente.", tone: "success" },
    );
  }

  const runTest = useCallback(async () => {
    if (isNew) {
      return;
    }
    setIsTesting(true);
    setNotice(null);
    try {
      const result = (await automationsApi.triggerWebhook(automationId!)) as {
        status?: string;
      };
      setNotice({
        text: `Disparador ejecutado: ${result.status ?? "queued"}.`,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "No se pudo disparar la automatización.",
        tone: "danger",
      });
    } finally {
      setIsTesting(false);
    }
  }, [automationId, isNew]);

  if (isLoading) {
    return <Skeleton className="h-[70vh] rounded-xl" />;
  }

  const showCatalog = Boolean(pending) || (!selectedStep && !selectedNote);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          aria-label="Volver a automatizaciones"
          render={<Link to="/admin/automations" />}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nombre de la automatización"
          className="h-9 max-w-xs font-medium"
        />
        <Input
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          list="automation-folders"
          placeholder="Carpeta (escribe o elige)"
          aria-label="Carpeta"
          className="h-9 max-w-44"
        />
        <datalist id="automation-folders">
          {folderOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsActive((current) => !current)}
        >
          {isActive ? "Activa" : "Pausada"}
        </Button>
        <Button variant="outline" size="sm" onClick={addNote}>
          <StickyNote data-icon="inline-start" aria-hidden="true" />
          Nota
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVariablesOpen(true)}
        >
          <Braces data-icon="inline-start" aria-hidden="true" />
          Variables
        </Button>
        <Button
          size="sm"
          className={AI_BUTTON_CLASS}
          onClick={() => setAiOpen(true)}
        >
          <Sparkles data-icon="inline-start" aria-hidden="true" />
          Generar con IA
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings data-icon="inline-start" aria-hidden="true" />
          Ajustes
        </Button>
        <div className="ms-auto flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => void runTest()}
              disabled={isTesting}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              {isTesting ? "Disparando…" : "Probar disparador"}
            </Button>
          )}
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            <Save data-icon="inline-start" aria-hidden="true" />
            {isSaving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.tone === "danger" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="min-h-0 overflow-hidden p-0">
          <div
            className="h-full min-h-[460px]"
            onDragOver={onCanvasDragOver}
            onDrop={onCanvasDrop}
          >
            <ReactFlow
              nodes={rfNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={(instance) => (rfInstanceRef.current = instance)}
              onNodesChange={onNodesChange}
              nodesConnectable={true}
              onConnect={onConnect}
              onNodeDragStop={(_, node) => {
                // Fija la posición movida a mano para que sobreviva a los
                // recálculos de layout al agregar/quitar pasos o notas.
                savedPositions.current.set(node.id, node.position);
              }}
              onNodeClick={(_, node) => {
                setSelectedId(node.id);
                setPending(null);
              }}
              onPaneClick={() => {
                setSelectedId(null);
                setPending(null);
              }}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </Card>

        <Card className="h-fit">
          <CardContent className="grid gap-4">
            {showCatalog ? (
              <>
                <div>
                  <p className="font-medium">
                    {pending ? "Elige la acción a insertar" : "Acciones"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pending
                      ? "Se conectará al punto que elegiste."
                      : "Toca un “+”, o arrastra una acción al lienzo y conéctala."}
                  </p>
                </div>
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={actionQuery}
                    onChange={(event) => setActionQuery(event.target.value)}
                    placeholder="Buscar acción"
                    aria-label="Buscar acción"
                    className="pl-9"
                  />
                </div>
                <div className="grid gap-4">
                  {ACTION_CATALOG.map((group) => {
                    const kinds = group.kinds.filter((kind) =>
                      STEP_META[kind].label
                        .toLowerCase()
                        .includes(actionQuery.trim().toLowerCase()),
                    );
                    if (kinds.length === 0) {
                      return null;
                    }
                    return (
                      <div key={group.group} className="grid gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {group.group}
                        </p>
                        {kinds.map((kind) => {
                          const meta = STEP_META[kind];
                          const Icon = meta.icon;
                          return (
                            <button
                              key={kind}
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  "application/x-step-kind",
                                  kind,
                                );
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              onClick={() => addStep(kind)}
                              className="flex cursor-grab items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none hover:border-primary/40 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                                <Icon className="size-4" aria-hidden="true" />
                              </span>
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {pending && (
                  <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                    <X data-icon="inline-start" aria-hidden="true" />
                    Cancelar inserción
                  </Button>
                )}
              </>
            ) : selectedNote ? (
              <NoteConfig
                note={selectedNote}
                onChange={(patch) => updateNote(selectedNote.id, patch)}
                onRemove={() => removeNote(selectedNote.id)}
              />
            ) : selectedStep ? (
              <StepConfig
                step={selectedStep}
                variables={variableList}
                tagOptions={tagOptions}
                emailTemplates={emailTemplates}
                onChange={updateSelected}
                onSwitchCaseChange={updateSwitchCase}
                onAddCase={() =>
                  updateSelected({
                    cases: [...(selectedStep.data.cases ?? []), ""],
                  })
                }
                onRemoveCase={(index) =>
                  updateSelected({
                    cases: (selectedStep.data.cases ?? []).filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
                onRemove={removeSelected}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <VariablesDialog
        open={variablesOpen}
        onOpenChange={setVariablesOpen}
        variables={variableList}
        onAdd={addVariable}
        onRemove={removeVariable}
      />

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar automatización con IA</DialogTitle>
            <DialogDescription>
              Describe el flujo que quieres y la IA lo arma por ti. Reemplaza el
              flujo actual del lienzo.
            </DialogDescription>
          </DialogHeader>
          {aiError && (
            <Alert variant="destructive">
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="ai-workflow-prompt">Descripción</Label>
            <textarea
              id="ai-workflow-prompt"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              rows={4}
              placeholder="p. ej. Cuando se registra un contacto, espera 1 día, envíale un WhatsApp de bienvenida y agrégale la etiqueta bienvenida."
              className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className={AI_BUTTON_CLASS}
              onClick={() => void generateWorkflowWithAi()}
              disabled={aiLoading || !aiPrompt.trim()}
            >
              <Sparkles data-icon="inline-start" aria-hidden="true" />
              {aiLoading ? "Generando…" : "Generar flujo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustes del flujo</DialogTitle>
            <DialogDescription>
              Configuración global del envío. Aplica a todos los pasos de este
              flujo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="flow-from-domain">Dominio de envío (correos)</Label>
            {emailDomains.filter((d) => d.status === "VERIFIED").length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay dominios verificados. Configúralos en Plantillas →
                Dominios de envío.
              </p>
            ) : (
              <Select
                items={emailDomains
                  .filter((d) => d.status === "VERIFIED")
                  .map((d) => ({ value: d.domain, label: d.domain }))}
                value={flowSettings.email_from_domain}
                onValueChange={(value) =>
                  setFlowSettings((current) => ({
                    ...current,
                    email_from_domain: value as string,
                  }))
                }
              >
                <SelectTrigger id="flow-from-domain" className="w-full">
                  <SelectValue placeholder="Elige un dominio" />
                </SelectTrigger>
                <SelectContent>
                  {emailDomains
                    .filter((d) => d.status === "VERIFIED")
                    .map((d) => (
                      <SelectItem key={d.id} value={d.domain}>
                        {d.domain}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flow-whatsapp-from">Número de WhatsApp remitente</Label>
            <Input
              id="flow-whatsapp-from"
              value={flowSettings.whatsapp_from}
              onChange={(event) =>
                setFlowSettings((current) => ({
                  ...current,
                  whatsapp_from: event.target.value,
                }))
              }
              placeholder="+58 412 555 1234"
            />
            <p className="text-xs text-muted-foreground">
              Se usa como remitente de los pasos "Enviar WhatsApp".
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        El motor de ejecución de flujos está fuera del alcance de esta entrega:
        las automatizaciones se diseñan y guardan, y el estado Activa indica que
        quedarían en producción.
      </p>
    </div>
  );
}

type StepConfigProps = {
  step: Step;
  variables: AutomationVariable[];
  tagOptions: string[];
  emailTemplates: EmailTemplate[];
  onChange: (patch: Partial<StepData>) => void;
  onSwitchCaseChange: (index: number, value: string) => void;
  onAddCase: () => void;
  onRemoveCase: (index: number) => void;
  onRemove: () => void;
};

function StepConfig({
  step,
  variables,
  tagOptions,
  emailTemplates,
  onChange,
  onSwitchCaseChange,
  onAddCase,
  onRemoveCase,
  onRemove,
}: StepConfigProps) {
  const { data } = step;
  const tagListId = "cfg-tag-options";

  return (
    <>
      <p className="font-medium">{STEP_META[data.kind].label}</p>

      {/* Etiquetas de la subcuenta activa, para autocompletar campos de etiqueta. */}
      <datalist id={tagListId}>
        {tagOptions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {data.kind === "trigger" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-trigger">Evento</Label>
          <Select
            items={TRIGGER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={data.trigger ?? "contact_created"}
            onValueChange={(value) => onChange({ trigger: value as string })}
          >
            <SelectTrigger id="cfg-trigger" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.kind === "wait" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="cfg-amount">Cantidad</Label>
            <Input
              id="cfg-amount"
              type="number"
              min="1"
              value={String(data.amount ?? 1)}
              onChange={(event) =>
                onChange({ amount: Number(event.target.value) || 1 })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-unit">Unidad</Label>
            <Select
              items={WAIT_UNITS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.unit ?? "days"}
              onValueChange={(value) =>
                onChange({ unit: value as StepData["unit"] })
              }
            >
              <SelectTrigger id="cfg-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAIT_UNITS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {(data.kind === "send_whatsapp" ||
        data.kind === "send_instagram" ||
        data.kind === "send_messenger") && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-message">
            {data.kind === "send_whatsapp"
              ? "Mensaje de WhatsApp"
              : data.kind === "send_instagram"
                ? "Mensaje de Instagram"
                : "Mensaje de Messenger"}
          </Label>
          <VariableTextarea
            id="cfg-message"
            value={data.message ?? ""}
            onChange={(value) => onChange({ message: value })}
            variables={variables}
            placeholder="¡Hola {{nombre}}! Tu paquete {{tracking}} va en camino."
          />
          <VariableHint />
        </div>
      )}

      {data.kind === "send_email" && (
        <>
          <div className="grid gap-2">
            <Label>Contenido</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={
                  (data.email_mode ?? "custom") === "template"
                    ? "default"
                    : "outline"
                }
                onClick={() => onChange({ email_mode: "template" })}
              >
                Usar plantilla
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  (data.email_mode ?? "custom") === "custom"
                    ? "default"
                    : "outline"
                }
                onClick={() => onChange({ email_mode: "custom" })}
              >
                Redactar aquí
              </Button>
            </div>
          </div>

          {(data.email_mode ?? "custom") === "template" ? (
            <div className="grid gap-2">
              <Label htmlFor="cfg-template">Plantilla</Label>
              {emailTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay plantillas en esta subcuenta. Créalas en la sección
                  Plantillas.
                </p>
              ) : (
                <Select
                  items={emailTemplates.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={data.template_id ?? ""}
                  onValueChange={(value) =>
                    onChange({ template_id: value as string })
                  }
                >
                  <SelectTrigger id="cfg-template" className="w-full">
                    <SelectValue placeholder="Elige una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(() => {
                const selected = emailTemplates.find(
                  (t) => t.id === data.template_id,
                );
                return selected ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">
                      {selected.subject || "Sin asunto"}
                    </p>
                    <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">
                      {stripHtml(selected.body) || "Sin contenido"}
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="cfg-subject">Asunto</Label>
                <Input
                  id="cfg-subject"
                  value={data.subject ?? ""}
                  onChange={(event) => onChange({ subject: event.target.value })}
                  placeholder="Tu paquete está en camino"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cfg-body">Cuerpo</Label>
                <VariableTextarea
                  id="cfg-body"
                  value={data.body ?? ""}
                  onChange={(value) => onChange({ body: value })}
                  variables={variables}
                  placeholder="Hola {{nombre}}, …"
                />
                <VariableHint />
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            El dominio de envío se define en{" "}
            <span className="font-medium">Ajustes</span> del flujo (aplica a todos
            los correos).
          </p>
        </>
      )}

      {data.kind === "add_tag" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-tag">Etiqueta</Label>
          <Input
            id="cfg-tag"
            value={data.tag ?? ""}
            onChange={(event) => onChange({ tag: event.target.value })}
            placeholder="bienvenida"
            list={tagListId}
          />
        </div>
      )}

      {data.kind === "send_webhook" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-url">URL de destino</Label>
            <Input
              id="cfg-url"
              value={data.url ?? ""}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://api.ejemplo.com/hook"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-method">Método</Label>
            <Select
              items={WEBHOOK_METHODS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.method ?? "POST"}
              onValueChange={(value) =>
                onChange({ method: value as "POST" | "GET" })
              }
            >
              <SelectTrigger id="cfg-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_METHODS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {(data.kind === "condition" || data.kind === "switch") && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-field">Campo</Label>
          <Select
            items={BRANCH_FIELDS.map((o) => ({ value: o.value, label: o.label }))}
            value={data.field ?? "tag"}
            onValueChange={(value) => onChange({ field: value as string })}
          >
            <SelectTrigger id="cfg-field" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_FIELDS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.kind === "condition" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-operator">Operador</Label>
            <Select
              items={CONDITION_OPERATORS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={data.operator ?? "equals"}
              onValueChange={(value) => onChange({ operator: value as string })}
            >
              <SelectTrigger id="cfg-operator" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {data.operator !== "exists" && (
            <div className="grid gap-2">
              <Label htmlFor="cfg-value">Valor</Label>
              <Input
                id="cfg-value"
                value={data.value ?? ""}
                onChange={(event) => onChange({ value: event.target.value })}
                placeholder="vip"
                list={data.field === "tag" ? tagListId : undefined}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            El flujo sigue por la rama “Sí” cuando se cumple, o “No” en caso
            contrario.
          </p>
        </>
      )}

      {data.kind === "switch" && (
        <div className="grid gap-2">
          <Label>Casos</Label>
          {(data.cases ?? []).map((value, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={value}
                onChange={(event) => onSwitchCaseChange(index, event.target.value)}
                placeholder={`Caso ${index + 1}`}
                aria-label={`Caso ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Eliminar caso ${index + 1}`}
                onClick={() => onRemoveCase(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddCase}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Agregar caso
          </Button>
          <p className="text-xs text-muted-foreground">
            Cada caso es una rama; “Otro” recoge lo que no coincida.
          </p>
        </div>
      )}

      <div className="grid gap-2 border-t pt-4">
        <Label htmlFor="cfg-label">Nombre visible</Label>
        <Input
          id="cfg-label"
          value={data.label ?? ""}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder={STEP_META[data.kind].label}
        />
        <Label className="mt-1">Color</Label>
        <div className="flex flex-wrap gap-1.5">
          {NODE_COLORS.map((option) => {
            const isActive = (data.color ?? "") === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ color: option.id })}
                aria-label={`Color ${option.label}`}
                aria-pressed={isActive}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110",
                  isActive
                    ? "border-ring ring-2 ring-ring/30"
                    : "border-transparent",
                )}
                style={{ backgroundColor: option.dot }}
              />
            );
          })}
        </div>
      </div>

      {data.kind !== "trigger" && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "justify-self-start text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
          onClick={onRemove}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Eliminar paso
        </Button>
      )}
    </>
  );
}

function VariableHint() {
  return (
    <p className="text-xs text-muted-foreground">
      Escribe{" "}
      <code className="rounded bg-primary/15 px-1 font-medium text-primary">
        {"{{"}
      </code>{" "}
      para ver las variables disponibles.
    </p>
  );
}

type NoteConfigProps = {
  note: Note;
  onChange: (patch: Partial<Omit<Note, "id">>) => void;
  onRemove: () => void;
};

function NoteConfig({ note, onChange, onRemove }: NoteConfigProps) {
  return (
    <>
      <p className="font-medium">Nota</p>
      <div className="grid gap-2">
        <Label htmlFor="cfg-note">Texto</Label>
        <textarea
          id="cfg-note"
          value={note.text}
          onChange={(event) => onChange({ text: event.target.value })}
          rows={5}
          placeholder="Escribe una anotación para tu equipo…"
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_COLORS.map((option) => {
            const isActive = note.color === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ color: option.id })}
                aria-label={`Color ${option.label}`}
                aria-pressed={isActive}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110",
                  isActive
                    ? "border-ring ring-2 ring-ring/30"
                    : "border-transparent",
                )}
                style={{ backgroundColor: option.swatch }}
              />
            );
          })}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 data-icon="inline-start" aria-hidden="true" />
        Eliminar nota
      </Button>
    </>
  );
}

type VariablesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: AutomationVariable[];
  onAdd: (raw: string) => void;
  onRemove: (token: string) => void;
};

function VariablesDialog({
  open,
  onOpenChange,
  variables,
  onAdd,
  onRemove,
}: VariablesDialogProps) {
  const [draft, setDraft] = useState("");
  const preview = normalizeVariableToken(draft);

  function commit() {
    onAdd(draft);
    setDraft("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Variables</DialogTitle>
          <DialogDescription>
            Insértalas en mensajes y emails como{" "}
            <code className="rounded bg-primary/15 px-1 font-medium text-primary">
              {"{{token}}"}
            </code>
            . Las integradas se rellenan con los datos del contacto y su envío.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="new-variable">Crear variable</Label>
          <div className="flex gap-2">
            <Input
              id="new-variable"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
              }}
              placeholder="p. ej. cupon_descuento"
            />
            <Button onClick={commit} disabled={!preview}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Agregar
            </Button>
          </div>
          {preview && (
            <p className="text-xs text-muted-foreground">
              Se guardará como{" "}
              <code className="rounded bg-primary/15 px-1 font-medium text-primary">
                {`{{${preview}}}`}
              </code>
            </p>
          )}
        </div>

        <div className="grid max-h-64 gap-1 overflow-auto">
          {variables.map((variable) => (
            <div
              key={variable.token}
              className="flex items-center gap-2 rounded-md px-1 py-1"
            >
              <code className="rounded bg-primary/15 px-1 text-xs font-medium text-primary">
                {`{{${variable.token}}}`}
              </code>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {variable.custom ? "Personalizada" : variable.description}
              </span>
              {variable.custom && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar variable ${variable.token}`}
                  onClick={() => onRemove(variable.token)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
