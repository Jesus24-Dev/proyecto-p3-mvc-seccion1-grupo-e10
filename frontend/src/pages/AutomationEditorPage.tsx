import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlignVerticalJustifyCenter,
  ArrowLeft,
  Braces,
  Filter,
  Play,
  Plus,
  Save,
  Search,
  Send,
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
  contactsApi,
  emailDomainsApi,
  emailTemplatesApi,
  tagsApi,
} from "@/api";
import { useAuth } from "@/context/AuthContext";
import { useActiveAgency } from "@/context/AgencyContext";
import { useMutationHandler } from "@/hooks/usePageData";
import { computeNodeStats, useAutomationRuns } from "@/hooks/useAutomationRuns";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AUTOMATION_VARIABLES,
  BRANCH_FIELDS,
  CONDITION_OPERATORS,
  CONTACT_FIELDS,
  NOTE_KINDS,
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
import {
  EnrollmentHistory,
  ExecutionLogs,
} from "@/components/automations/AutomationInsights";
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
  UserInformation,
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
  {
    group: "Contacto",
    kinds: ["add_tag", "remove_tag", "update_contact", "create_note"],
  },
  { group: "Equipo", kinds: ["notify_team"] },
  { group: "Inteligencia artificial", kinds: ["ai_generate"] },
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
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
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
  // Pestaña activa del editor: constructor / en vivo / historial / registros.
  const [view, setView] = useState<
    "builder" | "live" | "enrollment" | "logs"
  >("builder");
  // Ejecución manual ("Ejecutar"): diálogo de selección de contacto.
  const [runOpen, setRunOpen] = useState(false);
  // "sample" = deja que el servidor elija un contacto de muestra.
  const [runContactId, setRunContactId] = useState("sample");
  const [contacts, setContacts] = useState<UserInformation[]>([]);
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
    allow_reentry: boolean;
    ai_provider: string;
    ai_model: string;
    ai_api_key: string;
  }>({
    email_from_domain: "",
    whatsapp_from: "",
    allow_reentry: false,
    ai_provider: "openai",
    ai_model: "",
    ai_api_key: "",
  });
  // Filtros de las vistas de ejecución: por contacto ("all" = todos) y por
  // rango de fechas (YYYY-MM-DD, vacío = sin límite).
  const [runFilterContact, setRunFilterContact] = useState("all");
  const [runFilterFrom, setRunFilterFrom] = useState("");
  const [runFilterTo, setRunFilterTo] = useState("");
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

    Promise.all([
      tagsApi.list(),
      emailTemplatesApi.list(),
      emailDomainsApi.list(),
      contactsApi.list(),
    ])
      .then(([tags, templates, domains, contactList]) => {
        if (cancelled) {
          return;
        }
        setTagOptions([...new Set(scoped(tags).map((tag) => tag.name))]);
        setEmailTemplates(scoped(templates));
        setEmailDomains(scoped(domains));
        setContacts(contactList);
      })
      .catch(() => {
        if (!cancelled) {
          setTagOptions([]);
          setEmailTemplates([]);
          setEmailDomains([]);
          setContacts([]);
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

  // Ejecución en vivo (SSE): se conecta solo fuera del constructor.
  const { runs, isConnected } = useAutomationRuns(
    isNew ? undefined : automationId,
    !isNew && view !== "builder",
  );
  // Contactos presentes en las ejecuciones, para el filtro.
  const runContactOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of runs) {
      map.set(run.contact_id ?? "anon", run.contact_name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [runs]);
  // Ejecuciones filtradas por contacto y rango de fechas (aplican a las tres
  // vistas de ejecución).
  const filteredRuns = useMemo(() => {
    const fromTs = runFilterFrom
      ? new Date(`${runFilterFrom}T00:00:00`).getTime()
      : null;
    const toTs = runFilterTo
      ? new Date(`${runFilterTo}T23:59:59`).getTime()
      : null;
    return runs.filter((r) => {
      if (
        runFilterContact !== "all" &&
        (r.contact_id ?? "anon") !== runFilterContact
      ) {
        return false;
      }
      const ts = new Date(r.started_at).getTime();
      if (fromTs !== null && ts < fromTs) {
        return false;
      }
      if (toTs !== null && ts > toTs) {
        return false;
      }
      return true;
    });
  }, [runs, runFilterContact, runFilterFrom, runFilterTo]);
  const nodeStats = useMemo(() => computeNodeStats(filteredRuns), [filteredRuns]);
  const activeRunCount = useMemo(
    () =>
      filteredRuns.filter(
        (r) => r.status === "RUNNING" || r.status === "WAITING",
      ).length,
    [filteredRuns],
  );
  // Aristas de solo lectura para la vista en vivo (sin botón de borrar).
  // El camino recorrido (ambos extremos visitados) se resalta en verde.
  const liveEdges = useMemo(
    () =>
      validEdges.map((edge) => {
        const followed =
          (nodeStats[edge.source]?.visited ?? 0) > 0 &&
          (nodeStats[edge.target]?.visited ?? 0) > 0;
        return {
          ...edge,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            ...(followed ? { color: "var(--success)" } : {}),
          },
          ...(followed
            ? {
                animated: true,
                style: { stroke: "var(--success)", strokeWidth: 2.5 },
              }
            : {}),
        };
      }),
    [validEdges, nodeStats],
  );
  // Nodos de solo lectura: reutilizan las posiciones del constructor e
  // inyectan los agregados por nodo en `data.__live`.
  const liveNodes = useMemo<EditorNode[]>(
    () =>
      rfNodes.map((node) => {
        if (node.type === "note") {
          return { ...node, draggable: false, selectable: false };
        }
        const stat = nodeStats[node.id] ?? {
          active: 0,
          ok: 0,
          error: 0,
          visited: 0,
        };
        return {
          ...node,
          draggable: false,
          selectable: false,
          data: { ...(node.data as StepData), __live: stat },
        } as EditorNode;
      }),
    [rfNodes, nodeStats],
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
            allow_reentry: loadedSettings.allow_reentry ?? false,
            ai_provider: loadedSettings.ai_provider ?? "openai",
            ai_model: loadedSettings.ai_model ?? "",
            ai_api_key: loadedSettings.ai_api_key ?? "",
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
    function onDuplicateNote(event: Event) {
      duplicateNote((event as CustomEvent<{ nodeId: string }>).detail.nodeId);
    }
    function onDeleteNote(event: Event) {
      removeNote((event as CustomEvent<{ nodeId: string }>).detail.nodeId);
    }
    window.addEventListener("automation:edit-step", onEdit);
    window.addEventListener("automation:duplicate-step", onDuplicate);
    window.addEventListener("automation:delete-step", onDelete);
    // Las notas reutilizan el mismo "edit" (selecciona y abre el panel).
    window.addEventListener("automation:edit-note", onEdit);
    window.addEventListener("automation:duplicate-note", onDuplicateNote);
    window.addEventListener("automation:delete-note", onDeleteNote);
    return () => {
      window.removeEventListener("automation:edit-step", onEdit);
      window.removeEventListener("automation:duplicate-step", onDuplicate);
      window.removeEventListener("automation:delete-step", onDelete);
      window.removeEventListener("automation:edit-note", onEdit);
      window.removeEventListener("automation:duplicate-note", onDuplicateNote);
      window.removeEventListener("automation:delete-note", onDeleteNote);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, notes]);

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

  function duplicateNote(id: string) {
    const source = notes.find((note) => note.id === id);
    if (!source) {
      return;
    }
    const copyId = newId();
    const basePos = savedPositions.current.get(id) ?? { x: 360, y: 40 };
    savedPositions.current.set(copyId, {
      x: basePos.x + 24,
      y: basePos.y + 24,
    });
    setNotes((current) => [
      ...current,
      { id: copyId, text: source.text, color: source.color },
    ]);
    setSelectedId(copyId);
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

  // Reordena el lienzo con el auto-layout vertical, descartando las posiciones
  // movidas a mano (las notas flotantes se conservan).
  function autoAlign() {
    savedPositions.current.clear();
    const laid = layoutTree(steps, validEdges);
    const byId = new Map(laid.map((node) => [node.id, node.position]));
    setRfNodes((prev) =>
      prev.map((node) => {
        if (node.type === "note") {
          return node;
        }
        const position = byId.get(node.id);
        return position ? { ...node, position } : node;
      }),
    );
    window.requestAnimationFrame(() =>
      rfInstanceRef.current?.fitView({ padding: 0.2, duration: 300 }),
    );
    toast.success("Flujo alineado");
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
        allow_reentry: flowSettings.allow_reentry,
        ai_provider: flowSettings.ai_provider,
        ai_model: flowSettings.ai_model,
        ai_api_key: flowSettings.ai_api_key,
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
    if (failure) {
      toast.error("No se pudo guardar", { description: failure });
    } else {
      toast.success("Automatización guardada", {
        description: "Tus cambios quedaron guardados.",
      });
    }
  }

  // Ejecuta el flujo para un contacto (o una muestra) y salta a la vista en
  // vivo para verlo recorrer los nodos.
  const runNow = useCallback(async () => {
    if (isNew) {
      return;
    }
    setIsTesting(true);
    setNotice(null);
    try {
      const contactId = runContactId === "sample" ? undefined : runContactId;
      await automationsApi.run(automationId!, contactId);
      setRunOpen(false);
      setView("live");
      toast.success("Ejecución iniciada", {
        description: "Míralo avanzar en la vista En vivo.",
      });
    } catch (error) {
      toast.error("No se pudo ejecutar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsTesting(false);
    }
  }, [automationId, isNew, runContactId]);

  // Reintenta una ejecución: todo el flujo o solo los pasos fallidos.
  async function handleRetry(runId: string, mode: "full" | "failed") {
    if (isNew) {
      return;
    }
    const failure = await runMutation(async () => {
      await automationsApi.retryRun(automationId!, runId, mode);
    });
    if (failure) {
      toast.error("No se pudo reintentar", { description: failure });
      return;
    }
    setView("live");
    toast.success(
      mode === "full" ? "Reintentando todo el flujo" : "Reintentando pasos fallidos",
      { description: "Míralo en la vista En vivo." },
    );
  }

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
        {/* Carpeta = grupo para organizar los flujos en la lista. */}
        <Select
          items={[
            { value: "__none__", label: "Sin carpeta" },
            ...[...new Set([...folderOptions, folder].filter(Boolean))].map(
              (option) => ({ value: option, label: option }),
            ),
            { value: "__new__", label: "＋ Nueva carpeta…" },
          ]}
          value={folder || "__none__"}
          onValueChange={(value) => {
            if (value === "__new__") {
              setNewFolderName("");
              setNewFolderOpen(true);
              return;
            }
            setFolder(value === "__none__" ? "" : (value as string));
          }}
        >
          <SelectTrigger
            aria-label="Carpeta para organizar el flujo"
            title="Carpeta: agrupa este flujo con otros en la lista de automatizaciones"
            className="h-9 w-44"
          >
            <SelectValue placeholder="Sin carpeta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin carpeta</SelectItem>
            {[...new Set([...folderOptions, folder].filter(Boolean))].map(
              (option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ),
            )}
            <SelectItem value="__new__">＋ Nueva carpeta…</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva carpeta</DialogTitle>
              <DialogDescription>
                Agrupa automatizaciones relacionadas para encontrarlas fácil.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newFolderName.trim()) {
                  event.preventDefault();
                  const name = newFolderName.trim();
                  setFolderOptions((current) => [...new Set([...current, name])]);
                  setFolder(name);
                  setNewFolderOpen(false);
                }
              }}
              placeholder="p. ej. Bienvenida, Postventa…"
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={!newFolderName.trim()}
                onClick={() => {
                  const name = newFolderName.trim();
                  setFolderOptions((current) => [...new Set([...current, name])]);
                  setFolder(name);
                  setNewFolderOpen(false);
                }}
              >
                Crear carpeta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <label className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground select-none">
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            aria-label={isActive ? "Pausar automatización" : "Activar automatización"}
          />
          <span className="font-medium">{isActive ? "Activa" : "Pausada"}</span>
        </label>
        <Button variant="outline" size="sm" onClick={autoAlign}>
          <AlignVerticalJustifyCenter data-icon="inline-start" aria-hidden="true" />
          Auto-alinear
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
              onClick={() => setRunOpen(true)}
              disabled={isTesting}
            >
              <Play data-icon="inline-start" aria-hidden="true" />
              {isTesting ? "Ejecutando…" : "Ejecutar"}
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

      <div
        role="tablist"
        aria-label="Vistas de la automatización"
        className="flex items-center gap-1 border-b"
      >
        {(
          [
            { id: "builder", label: "Constructor" },
            { id: "live", label: "En vivo" },
            { id: "enrollment", label: "Historial de inscripciones" },
            { id: "logs", label: "Registros de ejecución" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:text-foreground",
              view === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view !== "builder" && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          {runContactOptions.length > 0 && (
            <Select
              items={[
                { value: "all", label: "Todos los contactos" },
                ...runContactOptions.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={runFilterContact}
              onValueChange={(value) => setRunFilterContact(value as string)}
            >
              <SelectTrigger className="h-9 w-56" aria-label="Filtrar por contacto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los contactos</SelectItem>
                {runContactOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1.5">
            <Label htmlFor="run-from" className="text-xs text-muted-foreground">
              Desde
            </Label>
            <Input
              id="run-from"
              type="date"
              value={runFilterFrom}
              max={runFilterTo || undefined}
              onChange={(event) => setRunFilterFrom(event.target.value)}
              className="h-9 w-40"
            />
            <Label htmlFor="run-to" className="text-xs text-muted-foreground">
              Hasta
            </Label>
            <Input
              id="run-to"
              type="date"
              value={runFilterTo}
              min={runFilterFrom || undefined}
              onChange={(event) => setRunFilterTo(event.target.value)}
              className="h-9 w-40"
            />
          </div>
          {(runFilterContact !== "all" || runFilterFrom || runFilterTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRunFilterContact("all");
                setRunFilterFrom("");
                setRunFilterTo("");
              }}
            >
              <X data-icon="inline-start" aria-hidden="true" />
              Limpiar
            </Button>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[1fr_20rem]",
          view !== "builder" && "hidden",
        )}
      >
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
              onInit={(instance) => {
                // El tipo de arista inferido no encaja con Edge (varianza);
                // el ref solo se usa para screenToFlowPosition.
                rfInstanceRef.current =
                  instance as ReactFlowInstance<EditorNode, Edge>;
              }}
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
              <Background
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1.5}
                className="!bg-muted/25"
              />
              <Controls
                showInteractive={false}
                className="!rounded-lg !border !border-border !bg-background !shadow-sm [&>button]:!border-border [&>button]:!bg-background [&>button]:!fill-muted-foreground hover:[&>button]:!bg-muted"
              />
              <MiniMap
                pannable
                zoomable
                className="!rounded-lg !border !border-border !bg-card"
                maskColor="color-mix(in oklch, var(--muted) 55%, transparent)"
                nodeColor={(node) =>
                  node.type === "note"
                    ? "var(--muted-foreground)"
                    : (node.data as StepData)?.kind === "trigger"
                      ? "var(--primary)"
                      : "var(--border)"
                }
              />
            </ReactFlow>
          </div>
        </Card>

        <Card className="min-h-0 self-stretch overflow-y-auto lg:max-h-[calc(100dvh-13rem)]">
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

      {view === "live" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isConnected
                    ? "bg-success motion-safe:animate-pulse"
                    : "bg-muted-foreground",
                )}
                aria-hidden="true"
              />
              {isConnected ? "En vivo" : "Conectando…"}
            </span>
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {activeRunCount}
              </span>{" "}
              en curso · {filteredRuns.length} inscripcion
              {filteredRuns.length === 1 ? "" : "es"}
            </span>
            <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
              Modo demo: las esperas se comprimen a segundos
            </span>
          </div>
          <Card className="min-h-0 flex-1 overflow-hidden p-0">
            <div className="h-full min-h-[460px]">
              <ReactFlow
                nodes={liveNodes}
                edges={liveEdges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={22}
                  size={1.5}
                  className="!bg-muted/25"
                />
                <Controls
                  showInteractive={false}
                  className="!rounded-lg !border !border-border !bg-background !shadow-sm [&>button]:!border-border [&>button]:!bg-background [&>button]:!fill-muted-foreground hover:[&>button]:!bg-muted"
                />
                <MiniMap
                  pannable
                  zoomable
                  className="!rounded-lg !border !border-border !bg-card"
                  maskColor="color-mix(in oklch, var(--muted) 55%, transparent)"
                  nodeColor={(node) =>
                    node.type === "note"
                      ? "var(--muted-foreground)"
                      : (node.data as StepData)?.kind === "trigger"
                        ? "var(--primary)"
                        : "var(--border)"
                  }
                />
              </ReactFlow>
            </div>
          </Card>
        </div>
      )}

      {(view === "enrollment" || view === "logs") && (
        <Card className="min-h-0 flex-1 overflow-y-auto">
          <CardContent className="p-4 md:p-6">
            {view === "enrollment" ? (
              <EnrollmentHistory runs={filteredRuns} onRetry={handleRetry} />
            ) : (
              <ExecutionLogs runs={filteredRuns} />
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="grid gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Inteligencia artificial</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Proveedor y clave para el paso "Generar con IA". La clave solo se
              usa para este flujo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="flow-ai-provider">Proveedor</Label>
                <Select
                  items={[
                    { value: "openai", label: "OpenAI" },
                    { value: "anthropic", label: "Anthropic" },
                  ]}
                  value={flowSettings.ai_provider || "openai"}
                  onValueChange={(value) =>
                    setFlowSettings((current) => ({
                      ...current,
                      ai_provider: value as string,
                    }))
                  }
                >
                  <SelectTrigger id="flow-ai-provider" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="flow-ai-model">Modelo</Label>
                <Input
                  id="flow-ai-model"
                  value={flowSettings.ai_model}
                  onChange={(event) =>
                    setFlowSettings((current) => ({
                      ...current,
                      ai_model: event.target.value,
                    }))
                  }
                  placeholder={
                    flowSettings.ai_provider === "anthropic"
                      ? "claude-3-5-haiku-latest"
                      : "gpt-4o-mini"
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flow-ai-key">Clave de API</Label>
              <Input
                id="flow-ai-key"
                type="password"
                autoComplete="off"
                value={flowSettings.ai_api_key}
                onChange={(event) =>
                  setFlowSettings((current) => ({
                    ...current,
                    ai_api_key: event.target.value,
                  }))
                }
                placeholder={
                  flowSettings.ai_provider === "anthropic" ? "sk-ant-…" : "sk-…"
                }
              />
              <p className="text-xs text-muted-foreground">
                Si la dejas vacía, se usa la clave configurada en el servidor.
              </p>
            </div>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <Label htmlFor="flow-reentry">Permitir re-entrada</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Un contacto puede inscribirse otra vez aunque ya esté recorriendo
                el flujo. Si está apagado, se ignoran las reinscripciones.
              </p>
            </div>
            <Switch
              id="flow-reentry"
              checked={flowSettings.allow_reentry}
              onCheckedChange={(value) =>
                setFlowSettings((current) => ({ ...current, allow_reentry: value }))
              }
              aria-label="Permitir re-entrada"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ejecutar automatización</DialogTitle>
            <DialogDescription>
              Inscribe un contacto y míralo recorrer el flujo en vivo. Corre
              aunque el flujo esté pausado (es una prueba).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="run-contact">Contacto</Label>
            <Select
              items={[
                { value: "sample", label: "Contacto de muestra" },
                ...contacts.map((contact) => ({
                  value: contact.id,
                  label: `${contact.first_name} ${contact.last_name}`.trim(),
                })),
              ]}
              value={runContactId}
              onValueChange={(value) => setRunContactId(value as string)}
            >
              <SelectTrigger id="run-contact" className="w-full">
                <SelectValue placeholder="Contacto de muestra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample">Contacto de muestra</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {`${contact.first_name} ${contact.last_name}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Las variables ({"{{nombre}}"}, {"{{tracking}}"}…) se rellenan con
              los datos de este contacto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void runNow()} disabled={isTesting}>
              <Play data-icon="inline-start" aria-hidden="true" />
              {isTesting ? "Ejecutando…" : "Ejecutar y ver en vivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        El motor de ejecución avanza cada inscripción paso a paso: usa{" "}
        <span className="font-medium">Ejecutar</span> para verlo en vivo. Con el
        flujo <span className="font-medium">Activo</span>, los disparadores
        (contacto creado, paquete entregado…) lo inician solos.
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
  // Catálogo de etiquetas de la subcuenta; incluye el valor ya guardado
  // aunque no esté en el catálogo, para no perderlo.
  const tagItemsFor = (current: string | undefined) =>
    Array.from(
      new Set([current, ...tagOptions].filter((t): t is string => Boolean(t))),
    );

  return (
    <>
      <p className="font-medium">{STEP_META[data.kind].label}</p>

      {data.kind === "trigger" && (
        <div className="grid gap-2">
          <Label>Evento</Label>
          <p className="text-xs text-muted-foreground">
            Elige un solo evento que inicia este flujo.
          </p>
          <div className="grid gap-2" role="radiogroup" aria-label="Evento disparador">
            {TRIGGER_OPTIONS.map((option) => {
              const selected = (data.trigger ?? "contact_created") === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ trigger: option.value })}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
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
          <TestSendRow
            channel={data.kind}
            build={() => ({ message: data.message ?? "" })}
          />
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
          <TestSendRow
            channel="send_email"
            build={() => {
              if ((data.email_mode ?? "custom") === "template") {
                const template = emailTemplates.find(
                  (t) => t.id === data.template_id,
                );
                return {
                  subject: template?.subject ?? "",
                  html: template?.body ?? "",
                };
              }
              return { subject: data.subject ?? "", message: data.body ?? "" };
            }}
          />
        </>
      )}

      {(data.kind === "add_tag" || data.kind === "remove_tag") && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-tag">Etiqueta</Label>
          {tagItemsFor(data.tag).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay etiquetas en esta subcuenta. Créalas en la sección
              Etiquetas.
            </p>
          ) : (
            <Select
              items={tagItemsFor(data.tag).map((t) => ({
                value: t,
                label: `#${t}`,
              }))}
              value={data.tag ?? ""}
              onValueChange={(value) => onChange({ tag: value as string })}
            >
              <SelectTrigger id="cfg-tag" className="w-full">
                <SelectValue placeholder="Elige una etiqueta" />
              </SelectTrigger>
              <SelectContent>
                {tagItemsFor(data.tag).map((t) => (
                  <SelectItem key={t} value={t}>
                    #{t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {data.kind === "update_contact" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-contact-field">Campo del contacto</Label>
            <Select
              items={CONTACT_FIELDS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.field ?? "phone"}
              onValueChange={(value) => onChange({ field: value as string })}
            >
              <SelectTrigger id="cfg-contact-field" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_FIELDS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-contact-value">Nuevo valor</Label>
            <VariableTextarea
              id="cfg-contact-value"
              value={data.value ?? ""}
              onChange={(value) => onChange({ value })}
              variables={variables}
              placeholder="p. ej. +58 412 555 1234"
            />
            <VariableHint />
          </div>
        </>
      )}

      {data.kind === "notify_team" && (
        <div className="grid gap-2">
          <Label htmlFor="cfg-notify">Aviso para el equipo</Label>
          <VariableTextarea
            id="cfg-notify"
            value={data.message ?? ""}
            onChange={(value) => onChange({ message: value })}
            variables={variables}
            placeholder="El contacto {{nombre}} necesita seguimiento."
          />
          <VariableHint />
          <p className="text-xs text-muted-foreground">
            Aparece en el feed de notificaciones del equipo.
          </p>
        </div>
      )}

      {data.kind === "create_note" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-note-kind">Tipo de nota</Label>
            <Select
              items={NOTE_KINDS.map((o) => ({ value: o.value, label: o.label }))}
              value={data.note_kind ?? "NOTE"}
              onValueChange={(value) => onChange({ note_kind: value as string })}
            >
              <SelectTrigger id="cfg-note-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_KINDS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-note-body">Contenido</Label>
            <VariableTextarea
              id="cfg-note-body"
              value={data.body ?? ""}
              onChange={(value) => onChange({ body: value })}
              variables={variables}
              placeholder="Anotación en la ficha del contacto…"
            />
            <VariableHint />
          </div>
        </>
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

      {data.kind === "ai_generate" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="cfg-ai-prompt">Instrucción para la IA</Label>
            <VariableTextarea
              id="cfg-ai-prompt"
              value={data.ai_prompt ?? ""}
              onChange={(value) => onChange({ ai_prompt: value })}
              variables={variables}
              placeholder="Redacta un mensaje corto y cálido para {{nombre}} avisando que su paquete {{tracking}} va en camino."
            />
            <VariableHint />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cfg-ai-output">Guardar la respuesta en</Label>
            <Input
              id="cfg-ai-output"
              value={data.ai_output ?? "ia_respuesta"}
              onChange={(event) => onChange({ ai_output: event.target.value })}
              placeholder="ia_respuesta"
            />
            <p className="text-xs text-muted-foreground">
              Reutilízala en pasos siguientes como{" "}
              <code className="rounded bg-primary/15 px-1 font-medium text-primary">
                {`{{${
                  normalizeVariableToken(data.ai_output || "ia_respuesta") ||
                  "ia_respuesta"
                }}}`}
              </code>
              . El proveedor y la clave se definen en{" "}
              <span className="font-medium">Ajustes → IA</span> del flujo.
            </p>
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
              {data.field === "tag" && tagItemsFor(data.value).length > 0 ? (
                <Select
                  items={tagItemsFor(data.value).map((t) => ({
                    value: t,
                    label: `#${t}`,
                  }))}
                  value={data.value ?? ""}
                  onValueChange={(value) => onChange({ value: value as string })}
                >
                  <SelectTrigger id="cfg-value" className="w-full">
                    <SelectValue placeholder="Elige una etiqueta" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagItemsFor(data.value).map((t) => (
                      <SelectItem key={t} value={t}>
                        #{t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="cfg-value"
                  value={data.value ?? ""}
                  onChange={(event) => onChange({ value: event.target.value })}
                  placeholder="vip"
                />
              )}
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

type TestChannel =
  | "send_email"
  | "send_whatsapp"
  | "send_instagram"
  | "send_messenger";

// Envío de prueba desde la configuración de un paso de mensajería/correo.
function TestSendRow({
  channel,
  build,
}: {
  channel: TestChannel;
  build: () => { subject?: string; message?: string; html?: string };
}) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const isEmail = channel === "send_email";

  async function send() {
    if (!to.trim()) {
      return;
    }
    setSending(true);
    try {
      const { subject, message, html } = build();
      const result = await automationsApi.testSend({
        channel,
        to: to.trim(),
        ...(subject ? { subject } : {}),
        ...(message ? { message } : {}),
        ...(html ? { html } : {}),
      });
      toast.success(result.simulated ? "Prueba simulada" : "Prueba enviada", {
        description: result.detail,
      });
    } catch (error) {
      toast.error("No se pudo enviar la prueba", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-dashed p-3">
      <Label htmlFor={`test-${channel}`} className="text-xs">
        {isEmail ? "Enviar prueba a un correo" : "Enviar prueba a un número"}
      </Label>
      <div className="flex gap-2">
        <Input
          id={`test-${channel}`}
          type={isEmail ? "email" : "text"}
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder={isEmail ? "tucorreo@ejemplo.com" : "+58 412 555 1234"}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void send()}
          disabled={sending || !to.trim()}
        >
          <Send data-icon="inline-start" aria-hidden="true" />
          {sending ? "Enviando…" : "Probar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Envía el contenido actual tal cual; las variables {"{{...}}"} no se
        rellenan en la prueba.
      </p>
    </div>
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
