import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { KeyRound, Package } from "lucide-react";
import { ApiRequestError, authApi } from "@/api";
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

/**
 * Página pública de recuperación de contraseña. Sin token en la URL pide el
 * correo y devuelve el enlace (envío simulado). Con token permite fijar la
 * nueva contraseña.
 */
export function PasswordResetPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Solicitud del enlace (modo "olvidé mi contraseña").
  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  // Fijar nueva contraseña (modo con token).
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRequest(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setRequesting(true);
    setRequestMsg(null);
    setResetLink(null);
    try {
      const result = await authApi.forgotPassword(email.trim());
      if (result.reset_token) {
        setResetLink(`${window.location.origin}/reset/${result.reset_token}`);
      }
      setRequestMsg(
        "Si el correo está registrado, enviamos un enlace para restablecer la contraseña.",
      );
    } catch (caught) {
      setRequestMsg(
        caught instanceof ApiRequestError
          ? caught.message
          : "No se pudo procesar la solicitud.",
      );
    } finally {
      setRequesting(false);
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    try {
      await authApi.resetPassword(token!, password);
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "No se pudo restablecer la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-medium tracking-tight">
          Dr Logistics · Contraseña
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden="true" />
            {token ? "Nueva contraseña" : "Recuperar contraseña"}
          </CardTitle>
          <CardDescription>
            {token
              ? "Define una nueva contraseña para tu cuenta."
              : "Te enviaremos un enlace para restablecer tu contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {token ? (
            done ? (
              <>
                <Alert>
                  <AlertDescription>
                    Contraseña actualizada. Ya puedes iniciar sesión.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => navigate("/")}>Ir a iniciar sesión</Button>
              </>
            ) : (
              <form onSubmit={handleReset} className="grid gap-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Restablecer contraseña"}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleRequest} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="forgot-email">Correo electrónico</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>
              <Button type="submit" disabled={requesting || !email.trim()}>
                {requesting ? "Enviando…" : "Enviar enlace"}
              </Button>
              {requestMsg && (
                <p className="text-sm text-muted-foreground">{requestMsg}</p>
              )}
              {resetLink && (
                <div className="grid gap-1 rounded-lg border bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">
                    Envío de correo simulado — abre tu enlace:
                  </p>
                  <Link
                    to={resetLink.replace(window.location.origin, "")}
                    className="truncate text-sm font-medium text-primary underline underline-offset-2"
                  >
                    {resetLink}
                  </Link>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/" className="underline underline-offset-2">
          Volver a iniciar sesión
        </Link>
      </p>
    </main>
  );
}
