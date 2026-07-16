import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, MapPin, Plus } from "lucide-react";
import { agenciesApi, packagesApi } from "@/api";
import { PackageStatusPill } from "@/components/shared/pills";
import { StatusStepper } from "@/components/tracking/StatusStepper";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { RouteMap } from "@/components/tracking/RouteMap";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { usePageData, useMutationHandler } from "@/hooks/usePageData";
import { PACKAGE_STATUSES, packageStatusLabel } from "@/lib/format";
import type { PackageStatus } from "@/types";

export function PackageTrackingPage() {
  const { trackingCode } = useParams();
  const runMutation = useMutationHandler();

  const { data, isLoading, error, reload } = usePageData(() =>
    Promise.all([
      packagesApi.getByTracking(trackingCode ?? ""),
      agenciesApi.list(),
    ]),
  );
  const [tracking, agencies] = data ?? [null, []];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    status: PackageStatus;
    agency_id: string;
    note: string;
  }>({ status: "IN_TRANSIT", agency_id: "", note: "" });

  const hasCoords = useMemo(
    () =>
      (tracking?.events ?? []).some(
        (event) => event.agency?.latitude != null,
      ),
    [tracking],
  );

  async function copyCode() {
    if (!tracking) return;
    try {
      await navigator.clipboard.writeText(tracking.tracking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // El portapapeles puede no estar disponible.
    }
  }

  function openDialog() {
    setForm({
      status: tracking?.status ?? "IN_TRANSIT",
      agency_id: "",
      note: "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function submitCheckpoint(event: FormEvent) {
    event.preventDefault();
    if (!tracking) return;
    setSaving(true);
    setFormError(null);
    const failure = await runMutation(async () => {
      await packagesApi.addEvent(tracking.id, {
        status: form.status,
        agency_id: form.agency_id || undefined,
        note: form.note.trim() || undefined,
      });
    });
    setSaving(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setDialogOpen(false);
    await reload();
  }

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="grid gap-2">
          <Skeleton className="h-7 w-72 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/admin/packages" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Volver a paquetes
        </Button>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            {error ?? "El paquete solicitado no existe."}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const contactName = tracking.contact
    ? `${tracking.contact.first_name} ${tracking.contact.last_name}`
    : "Sin contacto";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        className="mb-4"
        render={<Link to="/admin/packages" />}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver a paquetes
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <code className="font-mono text-lg font-semibold tracking-tight">
              {tracking.tracking_code}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copiar código de rastreo"
              onClick={() => void copyCode()}
            >
              {copied ? (
                <Check className="text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </Button>
            <PackageStatusPill status={tracking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {tracking.description} · {contactName}
          </p>
        </div>
        <Button onClick={openDialog}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Registrar movimiento
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="overflow-x-auto py-5">
          <div className="min-w-[32rem]">
            <StatusStepper status={tracking.status} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recorrido</CardTitle>
            <CardDescription>
              Historial de movimientos del paquete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackingTimeline events={tracking.events} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapa</CardTitle>
            <CardDescription>Ruta entre agencias.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasCoords ? (
              <RouteMap events={tracking.events} />
            ) : (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" />
                Aún no hay ubicaciones con coordenadas para dibujar el mapa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={submitCheckpoint} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Registrar movimiento</DialogTitle>
              <DialogDescription>
                Actualiza el estado del paquete y deja constancia en su
                recorrido.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="checkpoint-status">Estado</Label>
              <Select
                items={PACKAGE_STATUSES.map((status) => ({
                  value: status,
                  label: packageStatusLabel(status),
                }))}
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as PackageStatus,
                  }))
                }
              >
                <SelectTrigger id="checkpoint-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {packageStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="checkpoint-agency">Ubicación (agencia)</Label>
              <Select
                items={agencies.map((agency) => ({
                  value: agency.id,
                  label: agency.name,
                }))}
                value={form.agency_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, agency_id: value }))
                }
              >
                <SelectTrigger id="checkpoint-agency" className="w-full">
                  <SelectValue placeholder="Sin ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} · {agency.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="checkpoint-note">Nota (opcional)</Label>
              <Input
                id="checkpoint-note"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Salió a reparto con el mensajero…"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
