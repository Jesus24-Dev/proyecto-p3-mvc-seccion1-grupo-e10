import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, Package } from "lucide-react";
import { authApi, ApiRequestError } from "@/api";
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
import { useAuth } from "@/context/AuthContext";

export function MagicLinkPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, loginWithSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current || !token) return;
    consumed.current = true; // El enlace es de un solo uso: no reintentar.
    authApi
      .magicLogin(token)
      .then((nextSession) => {
        loginWithSession(nextSession);
        navigate("/admin", { replace: true });
      })
      .catch((caught) => {
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : "No se pudo iniciar sesión con este enlace.",
        );
      });
  }, [token, loginWithSession, navigate]);

  if (session?.user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Package className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xl font-medium tracking-tight">Dr Logistics</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {error ? "Enlace no válido" : "Entrando…"}
          </CardTitle>
          <CardDescription>
            {error
              ? "Este enlace mágico no funcionó."
              : "Validando tu enlace mágico y abriendo tu sesión."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Un momento…
            </div>
          )}
        </CardContent>
        {error && (
          <CardFooter>
            <Button className="w-full" render={<Link to="/" />}>
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
