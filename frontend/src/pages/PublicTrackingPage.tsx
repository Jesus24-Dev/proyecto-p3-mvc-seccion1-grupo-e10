import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, Search } from "lucide-react";
import { ApiRequestError, trackingApi } from "@/api";
import { PackageStatusPill } from "@/components/shared/pills";
import { StatusStepper } from "@/components/tracking/StatusStepper";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { RouteMap } from "@/components/tracking/RouteMap";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicTracking } from "@/types";

export function PublicTrackingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(code ?? "");
  const [tracking, setTracking] = useState<PublicTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza el campo con el código de la URL al navegar y limpia el
  // resultado anterior si se vuelve a la vista sin código (ajuste de estado
  // durante el render, no en un efecto).
  const [syncedCode, setSyncedCode] = useState(code ?? "");
  if ((code ?? "") !== syncedCode) {
    setSyncedCode(code ?? "");
    setQuery(code ?? "");
    if (!code) {
      setTracking(null);
      setError(null);
    }
  }

  // El fetch va dentro de una función async: los setState ocurren en callbacks,
  // no de forma síncrona en el cuerpo del efecto.
  useEffect(() => {
    if (!code) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await trackingApi.get(code);
        if (!cancelled) setTracking(result);
      } catch (caughtError: unknown) {
        if (cancelled) return;
        setTracking(null);
        setError(
          caughtError instanceof ApiRequestError
            ? caughtError.message
            : "No se pudo obtener el rastreo.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/track/${encodeURIComponent(trimmed)}`);
    }
  }

  const hasCoords = (tracking?.events ?? []).some(
    (event) => event.agency?.latitude != null,
  );

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-medium tracking-tight">
          Dr Logistics · Rastreo
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ingresa tu código de rastreo (p. ej. DRL-2026-…)"
            aria-label="Código de rastreo"
            className="pl-9"
          />
        </div>
        <Button type="submit">Rastrear</Button>
      </form>

      {isLoading && <Skeleton className="h-80 rounded-xl" />}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && !code && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ingresa el código de rastreo para ver dónde está tu paquete.
          </CardContent>
        </Card>
      )}

      {!isLoading && tracking && (
        <>
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-lg font-semibold tracking-tight">
                {tracking.tracking_code}
              </code>
              <PackageStatusPill status={tracking.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {tracking.description}
            </p>
          </div>

          <Card>
            <CardContent className="overflow-x-auto py-5">
              <div className="min-w-[32rem]">
                <StatusStepper status={tracking.status} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recorrido</CardTitle>
              </CardHeader>
              <CardContent>
                <TrackingTimeline events={tracking.events} />
              </CardContent>
            </Card>
            {hasCoords && (
              <Card>
                <CardHeader>
                  <CardTitle>Mapa</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteMap events={tracking.events} />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </main>
  );
}
