import {
  Clock,
  Mail,
  MessageCircle,
  Tag,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type StepKind =
  | "trigger"
  | "wait"
  | "send_whatsapp"
  | "send_email"
  | "add_tag";

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
  [key: string]: unknown;
};

export const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Contacto creado" },
  { value: "tag_added", label: "Etiqueta agregada a un contacto" },
  { value: "package_delivered", label: "Paquete entregado" },
  { value: "order_completed", label: "Envío completado" },
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
};

export const ADDABLE_STEPS: StepKind[] = [
  "wait",
  "send_whatsapp",
  "send_email",
  "add_tag",
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
  }
}
