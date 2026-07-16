import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, MailCheck, Package } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

type Status = "idle" | "loading" | "ok" | "error";

/**
 * Página pública de verificación de correo (sin sesión). Con token en la URL
 * verifica automáticamente; sin token permite reenviar el enlace por correo.
 */
export function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(token ? "loading" : "idle");
  const [message, setMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  // Reenvío del enlace (cuando no hay token o expiró).
  const [email, setEmail] = useState("");
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    setStatus("loading");
    setMessage(null);
    authApi
      .verifyEmail(token)
      .then((result) => {
        if (!active) return;
        setVerifiedEmail(result.email);
        setStatus("ok");
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(
          error instanceof ApiRequestError
            ? error.message
            : "No se pudo verificar el enlace.",
        );
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setResending(true);
    setResendMsg(null);
    setResendLink(null);
    try {
      const result = await authApi.resendVerification(email.trim());
      if (result.already_verified) {
        setResendMsg("Esa cuenta ya está verificada. Puedes iniciar sesión.");
      } else if (result.verification_token) {
        // El envío de correo está simulado en esta entrega: mostramos el enlace.
        setResendLink(
          `${window.location.origin}/verify/${result.verification_token}`,
        );
        setResendMsg("Enviamos un nuevo enlace de verificación al correo.");
      }
    } catch (error) {
      setResendMsg(
        error instanceof ApiRequestError
          ? error.message
          : "No se pudo reenviar el enlace.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-medium tracking-tight">
          Dr Logistics · Verificación
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="size-5 text-primary" aria-hidden="true" />
            Verifica tu correo
          </CardTitle>
          <CardDescription>
            Confirma tu dirección de correo para activar el acceso a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {status === "loading" && (
            <div className="grid gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          )}

          {status === "ok" && (
            <>
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  <CheckCircle2
                    className="size-4 text-success-foreground"
                    aria-hidden="true"
                  />
                  {verifiedEmail
                    ? `Cuenta ${verifiedEmail} verificada.`
                    : "Cuenta verificada."}{" "}
                  Ya puedes iniciar sesión.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate("/")}>Ir a iniciar sesión</Button>
            </>
          )}

          {status === "error" && message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status !== "ok" && (
            <form onSubmit={handleResend} className="grid gap-2 border-t pt-4">
              <Label htmlFor="verify-email">
                {status === "error"
                  ? "¿El enlace expiró? Reenvíalo"
                  : "Reenviar enlace de verificación"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={resending || !email.trim()}
                >
                  {resending ? "Enviando…" : "Reenviar"}
                </Button>
              </div>
              {resendMsg && (
                <p className="text-sm text-muted-foreground">{resendMsg}</p>
              )}
              {resendLink && (
                <div className="grid gap-1 rounded-lg border bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">
                    Envío de correo simulado — abre tu enlace:
                  </p>
                  <Link
                    to={resendLink.replace(window.location.origin, "")}
                    className="truncate text-sm font-medium text-primary underline underline-offset-2"
                  >
                    {resendLink}
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
