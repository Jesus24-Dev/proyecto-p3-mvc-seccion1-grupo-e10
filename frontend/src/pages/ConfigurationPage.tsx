import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  KeyRound,
  Mail,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { configApi, pipelineStagesApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { NODE_COLORS, nodeChipClass } from "@/lib/automationSteps";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types";

type Form = {
  company_name: string;
  company_rif: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  sender_email: string;
  support_email: string;
  bank_api_key: string;
  ml_api_key: string;
};

const EMPTY: Form = {
  company_name: "",
  company_rif: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  sender_email: "",
  support_email: "",
  bank_api_key: "",
  ml_api_key: "",
};

export function ConfigurationPage() {
  const { data, isLoading, error, reload } = usePageData(configApi.get);
  const runMutation = useMutationHandler();

  const [form, setForm] = useState<Form>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "success" | "danger";
  } | null>(null);

  // Hidrata el formulario una vez que llega la configuración.
  if (!hydrated && data) {
    setHydrated(true);
    setForm({
      company_name: data.company_name,
      company_rif: data.company_rif,
      company_address: data.company_address,
      company_phone: data.company_phone,
      company_email: data.company_email,
      sender_email: data.sender_email,
      support_email: data.support_email,
      bank_api_key: data.bank_api_key,
      ml_api_key: data.ml_api_key,
    });
  }

  function set<K extends keyof Form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const failure = await runMutation(async () => {
      await configApi.update(form);
    });
    setSaving(false);
    setNotice(
      failure
        ? { text: failure, tone: "danger" }
        : { text: "Configuración guardada.", tone: "success" },
    );
    void reload();
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Configuración del sistema"
          description="Parámetros globales de Dr-Logistics."
        />
        <div className="grid gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración del sistema"
        description="Parámetros globales de Dr-Logistics: empresa, correo, integraciones y estados logísticos."
      />

      {notice && (
        <Alert
          variant={notice.tone === "danger" ? "destructive" : "default"}
          className="mb-4"
        >
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
              Datos de la empresa
            </CardTitle>
            <CardDescription>
              Aparecen en reportes y comunicaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" id="cfg-name" value={form.company_name} onChange={(v) => set("company_name", v)} />
            <Field label="RIF" id="cfg-rif" value={form.company_rif} onChange={(v) => set("company_rif", v)} placeholder="J-12345678-9" />
            <Field label="Teléfono" id="cfg-phone" value={form.company_phone} onChange={(v) => set("company_phone", v)} />
            <Field label="Correo de la empresa" id="cfg-email" value={form.company_email} onChange={(v) => set("company_email", v)} />
            <div className="sm:col-span-2">
              <Field label="Dirección" id="cfg-address" value={form.company_address} onChange={(v) => set("company_address", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5 text-muted-foreground" aria-hidden="true" />
              Correo
            </CardTitle>
            <CardDescription>
              Direcciones usadas para el envío de correos (simulado).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo remitente" id="cfg-sender" value={form.sender_email} onChange={(v) => set("sender_email", v)} placeholder="no-reply@drlogistics.local" />
            <Field label="Correo de soporte" id="cfg-support" value={form.support_email} onChange={(v) => set("support_email", v)} placeholder="soporte@drlogistics.local" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />
              Integraciones (APIs)
            </CardTitle>
            <CardDescription>
              Claves de Banco Mercantil y Mercado Libre. Simuladas en esta
              entrega: se guardan pero no se usan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Clave API Banco Mercantil" id="cfg-bank" value={form.bank_api_key} onChange={(v) => set("bank_api_key", v)} placeholder="••••••••" />
            <Field label="Clave API Mercado Libre" id="cfg-ml" value={form.ml_api_key} onChange={(v) => set("ml_api_key", v)} placeholder="••••••••" />
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </form>

      {/* Etapas logísticas editables (fuera del form de configuración). */}
      <div className="mt-6">
        <StagesManager />
      </div>
    </>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// Gestor de etapas logísticas (item 12): renombrar, recolorear, reordenar,
// activar/desactivar, agregar y eliminar. Compartido por todas las cuentas.
function StagesManager() {
  const { data, isLoading, error, reload } = usePageData(pipelineStagesApi.list);
  const runMutation = useMutationHandler();
  const stages = [...(data ?? [])].sort((a, b) => a.position - b.position);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function mutate(fn: () => Promise<unknown>, okText?: string) {
    setBusy(true);
    const failure = await runMutation(async () => {
      await fn();
    });
    setBusy(false);
    if (failure) {
      toast.error("No se pudo guardar", { description: failure });
    } else if (okText) {
      toast.success(okText);
    }
    void reload();
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...stages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    await mutate(() => pipelineStagesApi.reorder(next.map((s) => s.id)));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    await mutate(() => pipelineStagesApi.create({ name }), "Etapa creada");
    setNewName("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="size-5 text-muted-foreground" aria-hidden="true" />
          Estados logísticos
        </CardTitle>
        <CardDescription>
          Ciclo de vida de un paquete. Renombra, reordena, cambia el color o
          agrega etapas; se aplican a todas las cuentas y al tablero.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            {stages.map((stage, index) => (
              <StageRow
                key={stage.id}
                stage={stage}
                index={index}
                total={stages.length}
                busy={busy}
                onMove={move}
                onRename={(name) =>
                  mutate(() => pipelineStagesApi.update(stage.id, { name }))
                }
                onColor={(color) =>
                  mutate(() => pipelineStagesApi.update(stage.id, { color }))
                }
                onToggle={(is_active) =>
                  mutate(() => pipelineStagesApi.update(stage.id, { is_active }))
                }
                onDelete={() =>
                  mutate(() => pipelineStagesApi.remove(stage.id), "Etapa eliminada")
                }
              />
            ))}
            <div className="flex items-center gap-2 border-t pt-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void add();
                  }
                }}
                placeholder="Nueva etapa (p. ej. En aduana)"
                className="h-9 max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !newName.trim()}
                onClick={() => void add()}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                Agregar etapa
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StageRow({
  stage,
  index,
  total,
  busy,
  onMove,
  onRename,
  onColor,
  onToggle,
  onDelete,
}: {
  stage: PipelineStage;
  index: number;
  total: number;
  busy: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(stage.name);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Subir"
          disabled={busy || index === 0}
          onClick={() => onMove(index, -1)}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Bajar"
          disabled={busy || index === total - 1}
          onClick={() => onMove(index, 1)}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
          nodeChipClass(stage.color),
        )}
      >
        {index + 1}
      </span>
      <Input
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== stage.name) onRename(name.trim());
        }}
        className="h-8 w-44"
      />
      <div className="flex flex-wrap items-center gap-1">
        {NODE_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Color ${c.label}`}
            aria-pressed={stage.color === c.id}
            title={c.label}
            onClick={() => onColor(c.id)}
            className={cn(
              "size-6 rounded-full border transition-transform hover:scale-110",
              stage.color === c.id && "ring-2 ring-ring ring-offset-1",
            )}
            style={{ backgroundColor: c.dot }}
          />
        ))}
      </div>
      {stage.is_system ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          Sistema
        </span>
      ) : (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
          Personalizada
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch
            checked={stage.is_active}
            onCheckedChange={(v) => onToggle(Boolean(v))}
            disabled={busy}
          />
          Activa
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy || stage.is_system}
          title={
            stage.is_system
              ? "Las etapas del sistema no se eliminan"
              : "Eliminar etapa"
          }
          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
