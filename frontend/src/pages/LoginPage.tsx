import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MapPin, Package, Sparkles, Truck, Zap } from "lucide-react";
import { ApiRequestError, authApi } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const STAFF_ROLES = new Set(["ADMIN", "SUPERADMIN", "DISTRIBUTOR"]);

// Puntos destacados de la marca, mostrados en el panel lateral.
const HIGHLIGHTS = [
  { icon: Truck, title: "Rastreo entre agencias", body: "Sigue cada paquete de origen a destino en tiempo real." },
  { icon: Zap, title: "Automatizaciones", body: "Flujos que responden solos a cada cambio de estado." },
  { icon: MapPin, title: "Red de subcuentas", body: "Opera todas tus sedes desde un mismo panel." },
];

export function LoginPage() {
  const { session, sessionNotice, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  if (session && STAFF_ROLES.has(session.user.role)) {
    return <Navigate to="/admin" replace />;
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace mágico.");
      return;
    }
    setMagicLoading(true);
    setError(null);
    try {
      await authApi.requestMagicLink(email.trim());
      setMagicSent(true);
    } catch {
      // No revelamos si el correo existe; mostramos confirmación igualmente.
      setMagicSent(true);
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNeedsVerification(false);

    try {
      await login({ email, password });
      navigate("/admin", { replace: true });
    } catch (caughtError) {
      if (
        caughtError instanceof ApiRequestError &&
        caughtError.statusCode === 403 &&
        caughtError.message.toLowerCase().includes("verifica tu correo")
      ) {
        setNeedsVerification(true);
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const notice = error ?? sessionNotice;

  // Acento violeta propio de la pantalla de acceso, para que el botón y los
  // anillos de foco combinen con el emblema del panel de marca.
  const accent = {
    "--primary": "oklch(0.55 0.22 285)",
    "--primary-foreground": "oklch(0.99 0 0)",
    "--ring": "oklch(0.55 0.22 285)",
  } as CSSProperties;

  return (
    <main
      className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]"
      style={accent}
    >
      {/* Panel de marca: oscuro, con degradados, textura y emblema brillante. */}
      <section className="relative hidden select-none flex-col justify-between overflow-hidden bg-[#0a0912] p-12 text-white lg:flex">
        {/* Lavados de color (degradados radiales violeta). */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 15% 0%, oklch(0.55 0.22 285 / 0.45), transparent 55%)," +
              "radial-gradient(90% 70% at 100% 100%, oklch(0.5 0.2 300 / 0.4), transparent 55%)," +
              "radial-gradient(60% 60% at 60% 40%, oklch(0.6 0.18 265 / 0.25), transparent 60%)",
          }}
        />
        {/* Textura de rejilla de puntos. */}
        <div className="login-grid pointer-events-none absolute inset-0" />
        {/* Viñeta para asentar el contenido. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 50%, transparent 55%, #05040a 100%)",
          }}
        />

        {/* Marca */}
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Dr Logistics
          </span>
        </div>

        {/* Emblema central + titular */}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-10 flex items-center justify-center">
            {/* Resplandor difuso detrás del emblema. */}
            <div
              className="login-glow absolute size-56 rounded-full blur-3xl"
              style={{ background: "oklch(0.55 0.24 285 / 0.55)" }}
              aria-hidden="true"
            />
            <div
              className="login-float relative flex size-32 items-center justify-center rounded-[1.75rem] ring-1 ring-white/20"
              style={{
                background:
                  "linear-gradient(145deg, oklch(0.68 0.2 290), oklch(0.45 0.22 280))",
                boxShadow:
                  "0 20px 60px -12px oklch(0.5 0.22 285 / 0.8), inset 0 1px 0 oklch(1 0 0 / 0.4)",
              }}
            >
              <Package className="size-14 text-white" aria-hidden="true" />
            </div>
          </div>
          <h1 className="max-w-md text-4xl leading-tight font-semibold tracking-tight text-balance">
            Toda tu red logística, en un solo panel
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Paquetes, envíos entre agencias, pagos y automatizaciones — con la
            trazabilidad de punta a punta.
          </p>
        </div>

        {/* Puntos destacados */}
        <ul className="relative grid gap-4">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/10">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-white/50">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Panel del formulario */}
      <section className="relative flex flex-col items-center justify-center gap-6 bg-background px-4 py-10">
        {/* Marca (visible en móvil, donde el panel lateral se oculta). */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-medium tracking-tight">
            Dr Logistics
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Inicia sesión
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Usa tu cuenta de administrador para entrar al panel de
              operaciones.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@drlogistics.local"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {magicSent && (
              <Alert>
                <AlertDescription>
                  Si tu correo está registrado, te enviamos un enlace para
                  entrar sin contraseña. Revisa tu bandeja de entrada.
                </AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert variant="destructive">
                <AlertDescription>
                  {notice}
                  {needsVerification && (
                    <>
                      {" "}
                      <Link
                        to="/verify"
                        className="font-medium underline underline-offset-2"
                      >
                        Verificar mi correo
                      </Link>
                      .
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Iniciar sesión"}
            </Button>
            <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />o
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={magicLoading}
              onClick={() => void sendMagicLink()}
            >
              <Sparkles data-icon="inline-start" aria-hidden="true" />
              {magicLoading ? "Enviando…" : "Enviar enlace mágico"}
            </Button>
            <Link
              to="/forgot"
              className="mx-auto text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </form>

          <div className="mt-8 space-y-1 text-center text-xs text-balance text-muted-foreground">
            <p className="font-medium text-foreground/70">Cuentas de prueba</p>
            <p>Superadmin · admin@drlogistics.local · Admin123*</p>
            <p>Admin de agencia · agencia@drlogistics.local · Agencia123*</p>
            <p>Admin de sede (Valencia) · sede@drlogistics.local · Sede123*</p>
            <p className="text-muted-foreground/70">
              (disponibles si ejecutaste el seeder del backend)
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
