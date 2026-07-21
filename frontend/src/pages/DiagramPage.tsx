import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Maximize2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";

// Diagrama entidad-relación del modelo de datos (Prisma). Se mantiene a mano
// para reflejar el esquema; es la documentación viva del backend.
const ER_DIAGRAM = `erDiagram
  users ||--o| users_information : "ficha"
  users ||--o{ orders : "crea"
  users ||--o{ agencies : "posee"
  users ||--o{ agency_members : "membresías"
  agencies ||--o{ agency_members : "miembros"
  agencies ||--o{ users_information : "contactos"
  agencies ||--o{ orders : "origen/destino"
  agencies ||--o{ package_events : "checkpoints"
  agencies ||--o{ tags : "catálogo"
  agencies ||--o{ email_templates : "plantillas"
  agencies ||--o{ email_domains : "dominios"
  users_information ||--o{ packages : "destinatario"
  users_information ||--o{ transactions : "reporta"
  users_information ||--o{ client_notes : "notas"
  users_information ||--o{ automation_runs : "inscripciones"
  orders ||--o{ packages : "transporta"
  orders ||--o{ transactions : "cubre"
  pipeline_stages ||--o{ packages : "etapa"
  packages ||--o{ package_events : "recorrido"
  packages ||--o{ transactions : "pagos"
  automations ||--o{ automation_runs : "ejecuciones"
  automation_runs ||--o{ automation_run_events : "pasos"

  users {
    string id PK
    string email UK
    roles role
    boolean email_verified
  }
  users_information {
    string id PK
    string first_name
    string last_name
    string document_id
    string agency_id FK
    datetime deleted_at
  }
  agencies {
    string id PK
    string name
    string location
    float latitude
    float longitude
    boolean is_active
  }
  agency_members {
    string id PK
    agency_role role
    string agency_id FK
    string user_id FK
  }
  orders {
    string id PK
    float amount
    transfer_status status
    string origin_agency_id FK
    string destination_agency_id FK
  }
  packages {
    string id PK
    string tracking_code UK
    package_status status
    string stage_id FK
    string contact_id FK
    string order_id FK
    datetime deleted_at
  }
  pipeline_stages {
    string id PK
    string name
    int position
    boolean is_system
    package_status status
  }
  package_events {
    string id PK
    package_status status
    string note
    string package_id FK
    string agency_id FK
  }
  transactions {
    string id PK
    string reference
    float amount
    payment_status status
    payment_method method
    payment_kind kind
    string contact_id FK
    datetime deleted_at
  }
  client_notes {
    string id PK
    note_kind kind
    string body
    string contact_id FK
  }
  automations {
    string id PK
    string name
    string folder
    boolean is_active
  }
  automation_runs {
    string id PK
    automation_run_status status
    string automation_id FK
    string contact_id FK
  }
  automation_run_events {
    string id PK
    automation_event_result result
    string run_id FK
  }
  tags {
    string id PK
    string name
    string color
    string agency_id FK
  }
  email_templates {
    string id PK
    string name
    string agency_id FK
  }
  email_domains {
    string id PK
    string domain
    email_domain_status status
    string agency_id FK
  }
  notifications {
    string id PK
    notification_kind kind
    string title
    boolean read
  }
  audit_logs {
    string id PK
    string action
    string entity
    string user_email
  }
  app_roles {
    string id PK
    string name UK
    boolean is_system
  }
  smart_lists {
    string id PK
    string name
    json conditions
  }
  system_config {
    string id PK
    string company_name
  }`;

export function DiagramPage() {
  const { mode } = useTheme();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Estado de pan/zoom del lienzo (translate + scale).
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const resetView = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);
  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => ({
        ...v,
        scale: Math.min(3, Math.max(0.3, v.scale * factor)),
      })),
    [],
  );

  // Zoom con la rueda hacia el cursor. Se registra como listener nativo NO
  // pasivo porque React adjunta onWheel como pasivo y preventDefault fallaría.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView((v) => {
        const nextScale = Math.min(
          3,
          Math.max(0.3, v.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1)),
        );
        const ratio = nextScale / v.scale;
        return {
          scale: nextScale,
          x: px - (px - v.x) * ratio,
          y: py - (py - v.y) * ratio,
        };
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [status]);

  function handlePointerDown(event: React.PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: view.x, oy: view.y };
  }
  function handlePointerMove(event: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
  }
  function endDrag() {
    drag.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    // Carga diferida: mermaid solo entra al bundle en esta ruta.
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: mode === "dark" ? "dark" : "default",
          securityLevel: "loose",
          er: { useMaxWidth: false },
          themeVariables: { fontFamily: "inherit" },
        });
        const { svg } = await mermaid.render(
          `er-${mode}-${Date.now()}`,
          ER_DIAGRAM,
        );
        if (cancelled) return;
        setSvg(svg);
        resetView();
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMsg(
          error instanceof Error ? error.message : "No se pudo dibujar.",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, resetView]);

  async function copySource() {
    try {
      await navigator.clipboard.writeText(ER_DIAGRAM);
      setCopied(true);
      toast.success("Código Mermaid copiado");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <>
      <PageHeader
        title="Diagrama del modelo"
        description="Entidades y relaciones del modelo de datos (Prisma). Documentación viva del backend."
      >
        <Button variant="outline" onClick={() => void copySource()}>
          {copied ? (
            <Check data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Copy data-icon="inline-start" aria-hidden="true" />
          )}
          Copiar Mermaid
        </Button>
      </PageHeader>

      {status === "error" && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            No se pudo renderizar el diagrama. {errorMsg}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="relative">
            {status === "loading" && (
              <div className="flex h-[70vh] items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Dibujando diagrama…
              </div>
            )}

            {status !== "loading" && (
              <>
                {/* Controles de zoom */}
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 rounded-lg border bg-background/80 p-1 shadow-sm backdrop-blur">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Acercar"
                    onClick={() => zoomBy(1.2)}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Alejar"
                    onClick={() => zoomBy(1 / 1.2)}
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Restablecer vista"
                    onClick={resetView}
                  >
                    <Maximize2 aria-hidden="true" />
                  </Button>
                </div>

                {/* Lienzo: rueda para zoom, arrastrar para desplazar. */}
                <div
                  ref={viewportRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                  className="h-[70vh] cursor-grab touch-none overflow-hidden rounded-lg border bg-muted/20 active:cursor-grabbing"
                  role="img"
                  aria-label="Diagrama entidad-relación del modelo de datos. Usa la rueda para acercar y arrastra para desplazar."
                >
                  <div
                    className="w-max origin-top-left [&_svg]:h-auto"
                    style={{
                      transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                    }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Rueda para acercar · arrastra para desplazar ·{" "}
                  {Math.round(view.scale * 100)}%
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
