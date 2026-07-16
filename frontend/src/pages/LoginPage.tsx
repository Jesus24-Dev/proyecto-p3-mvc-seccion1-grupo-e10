import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { ApiRequestError } from "@/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { session, sessionNotice, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session?.user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
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
      // Solo el bloqueo por verificación ofrece el enlace (no el 403 de "solo
      // ADMIN"), distinguiéndolos por el mensaje del backend.
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

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-medium tracking-tight">
          Dr Logistics
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Inicia sesión</CardTitle>
          <CardDescription>
            Usa tu cuenta de administrador para entrar al panel de operaciones.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
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
          </CardContent>
          <CardFooter className="mt-6 flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="max-w-sm text-center text-xs text-balance text-muted-foreground">
        Cuenta de prueba: admin@drlogistics.local · Admin123* (disponible si
        ejecutaste el seeder del backend).
      </p>
    </main>
  );
}
