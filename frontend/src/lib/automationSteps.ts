import {
  Clock,
  GitBranch,
  Mail,
  MessageCircle,
  Split,
  Tag,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type StepKind =
  | "trigger"
  | "wait"
  | "send_whatsapp"
  | "send_email"
  | "add_tag"
  | "send_webhook"
  | "condition"
  | "switch";

export type StepData = {
  kind: StepKind;
  /** trigger */
  trigger?: string;
  /** wait */
  amount?: number;
  unit?: "minutes" | "hours" | "days";
  /** send_whatsapp */
  message?: string;
  /** send_email */
  subject?: string;
  body?: string;
  /** add_tag */
  tag?: string;
  /** send_webhook */
  url?: string;
  method?: "POST" | "GET";
  /** condition / switch */
  field?: string;
  operator?: string;
  value?: string;
  cases?: string[];
  [key: string]: unknown;
};

/** Campos del contacto/evento sobre los que ramifica un condicional. */
export const BRANCH_FIELDS = [
  { value: "tag", label: "Etiqueta del contacto" },
  { value: "agency", label: "Agencia del contacto" },
  { value: "package_status", label: "Estado del paquete" },
  { value: "order_status", label: "Estado del envío" },
] as const;

export const CONDITION_OPERATORS = [
  { value: "equals", label: "es igual a" },
  { value: "not_equals", label: "es distinto de" },
  { value: "contains", label: "contiene" },
  { value: "exists", label: "existe" },
] as const;

/** Salidas (handles de origen) de un nodo según su tipo. */
export type StepBranch = { id: string; label: string };

export function branchesFor(data: StepData): StepBranch[] {
  if (data.kind === "condition") {
    return [
      { id: "true", label: "Sí" },
      { id: "false", label: "No" },
    ];
  }
  if (data.kind === "switch") {
    const cases = (data.cases ?? []).filter((item) => item.trim().length > 0);
    return [
      ...cases.map((item) => ({ id: `case:${item}`, label: item })),
      { id: "default", label: "Otro" },
    ];
  }
  // Un solo camino de salida para el resto de pasos (los disparadores incluidos).
  return [{ id: "out", label: "" }];
}

export const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Contacto creado" },
  { value: "tag_added", label: "Etiqueta agregada a un contacto" },
  { value: "package_delivered", label: "Paquete entregado" },
  { value: "order_completed", label: "Envío completado" },
  { value: "webhook_received", label: "Webhook recibido" },
] as const;

export const WAIT_UNITS = [
  { value: "minutes", label: "minutos" },
  { value: "hours", label: "horas" },
  { value: "days", label: "días" },
] as const;

type StepMeta = {
  label: string;
  icon: LucideIcon;
  /** Resumen de una línea mostrado dentro del nodo. */
  summary: (data: StepData) => string;
};

export const STEP_META: Record<StepKind, StepMeta> = {
  trigger: {
    label: "Disparador",
    icon: Zap,
    summary: (data) =>
      TRIGGER_OPTIONS.find((option) => option.value === data.trigger)?.label ??
      "Elige un evento",
  },
  wait: {
    label: "Esperar",
    icon: Clock,
    summary: (data) => {
      const unit =
        WAIT_UNITS.find((option) => option.value === data.unit)?.label ??
        "días";
      return `${data.amount ?? 1} ${unit}`;
    },
  },
  send_whatsapp: {
    label: "Enviar WhatsApp",
    icon: MessageCircle,
    summary: (data) =>
      data.message ? `"${data.message.slice(0, 42)}…"` : "Escribe el mensaje",
  },
  send_email: {
    label: "Enviar email",
    icon: Mail,
    summary: (data) => data.subject || "Define el asunto",
  },
  add_tag: {
    label: "Agregar etiqueta",
    icon: Tag,
    summary: (data) => (data.tag ? `#${data.tag}` : "Elige la etiqueta"),
  },
  send_webhook: {
    label: "Enviar webhook",
    icon: Webhook,
    summary: (data) => {
      if (!data.url) {
        return "Define la URL de destino";
      }
      const method = data.method ?? "POST";
      try {
        return `${method} ${new URL(data.url).host}`;
      } catch {
        return `${method} ${data.url.slice(0, 32)}`;
      }
    },
  },
  condition: {
    label: "Condición (Sí / No)",
    icon: GitBranch,
    summary: (data) => {
      const field =
        BRANCH_FIELDS.find((option) => option.value === data.field)?.label ??
        "Elige un campo";
      const operator = CONDITION_OPERATORS.find(
        (option) => option.value === data.operator,
      )?.label;
      if (!operator) {
        return field;
      }
      return data.operator === "exists"
        ? `${field} ${operator}`
        : `${field} ${operator} "${data.value ?? ""}"`;
    },
  },
  switch: {
    label: "Bifurcar (switch)",
    icon: Split,
    summary: (data) => {
      const field =
        BRANCH_FIELDS.find((option) => option.value === data.field)?.label ??
        "Elige un campo";
      const count = (data.cases ?? []).filter((c) => c.trim()).length;
      return `${field} · ${count} caso${count === 1 ? "" : "s"}`;
    },
  },
};

export const ADDABLE_STEPS: StepKind[] = [
  "wait",
  "send_whatsapp",
  "send_email",
  "add_tag",
  "send_webhook",
  "condition",
  "switch",
];

export function defaultDataFor(kind: StepKind): StepData {
  switch (kind) {
    case "trigger":
      return { kind, trigger: "contact_created" };
    case "wait":
      return { kind, amount: 1, unit: "days" };
    case "send_whatsapp":
      return { kind, message: "" };
    case "send_email":
      return { kind, subject: "", body: "" };
    case "add_tag":
      return { kind, tag: "" };
    case "send_webhook":
      return { kind, url: "", method: "POST" };
    case "condition":
      return { kind, field: "tag", operator: "equals", value: "" };
    case "switch":
      return { kind, field: "package_status", cases: ["", ""] };
  }
}

/** Divide un texto en segmentos, marcando las variables {{...}}. */
export function splitVariables(
  text: string,
): Array<{ text: string; variable: boolean }> {
  const segments: Array<{ text: string; variable: boolean }> = [];
  const pattern = /\{\{\s*[\w.]+\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), variable: false });
    }
    segments.push({ text: match[0], variable: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), variable: false });
  }

  return segments;
}
