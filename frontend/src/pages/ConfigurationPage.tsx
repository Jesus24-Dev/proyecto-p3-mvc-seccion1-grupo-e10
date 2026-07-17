import { useState, type FormEvent } from "react";
import { Building2, KeyRound, Mail, Workflow } from "lucide-react";
import { configApi } from "@/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { useMutationHandler, usePageData } from "@/hooks/usePageData";
import { PACKAGE_STATUSES, packageStatusLabel } from "@/lib/format";

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
        <PageHeader title="Configuración del sistema" />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="size-5 text-muted-foreground" aria-hidden="true" />
              Estados logísticos
            </CardTitle>
            <CardDescription>
              Ciclo de vida de un paquete (definido por el sistema).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PACKAGE_STATUSES.map((status, index) => (
              <Badge key={status} variant="secondary" className="gap-1.5">
                <span className="text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                {packageStatusLabel(status)}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </form>
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
