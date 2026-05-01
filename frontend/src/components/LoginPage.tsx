import type { FormEvent } from "react";
import type { LoginPayload } from "../types";

type LoginPageProps = {
  authError: string | null;
  isLoggingIn: boolean;
  loginForm: LoginPayload;
  onLoginFieldChange: (field: keyof LoginPayload, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginPage({
  authError,
  isLoggingIn,
  loginForm,
  onLoginFieldChange,
  onSubmit,
}: LoginPageProps) {
  return (
    <main className="app-shell login-shell">
      <section className="login-grid">
        <article className="login-story">
          <div>
            <span className="brand-stamp">Domesa Venezuela</span>
            <h1 className="login-title">
              Centro logístico y control de agencias
            </h1>
            <p className="login-copy">
              Accede al panel para coordinar sucursales, operadores y
              responsables de rutas en una interfaz pensada para una red de
              encomiendas nacional.
            </p>
          </div>
          <div className="login-credential-card">
            <p className="eyebrow">Cuenta de prueba</p>
            <strong className="credential-value">
              admin@drlogistics.local
            </strong>
            <span className="credential-value credential-value-accent">
              Admin123*
            </span>
            <p className="credential-note">
              Credenciales disponibles si ejecutaste `npm run db:seed` en el
              backend.
            </p>
          </div>
        </article>

        <form className="page-card auth-card" onSubmit={onSubmit}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Acceso seguro</p>
              <h2>Iniciar sesión</h2>
              <p className="section-copy">
                Solo las cuentas con permisos de administración pueden entrar al
                centro de control.
              </p>
            </div>
          </div>

          <label>
            Correo electrónico
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                onLoginFieldChange("email", event.target.value)
              }
              placeholder="admin@drlogistics.local"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                onLoginFieldChange("password", event.target.value)
              }
              placeholder="Tu contraseña"
              required
            />
          </label>

          {authError && <div className="alert error">{authError}</div>}

          <button
            className="primary-button primary-button-inline"
            type="submit"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}
