import type { FormEvent } from "react";
import { roleLabel, roles } from "../lib/roles";
import type { CreateUserPayload, User, UserRole } from "../types";

type UserFormPageProps = {
  editingUser: User | null;
  error: string | null;
  form: CreateUserPayload;
  isSaving: boolean;
  message: string | null;
  onBack: () => void;
  onFieldChange: (field: keyof CreateUserPayload, value: string) => void;
  onRoleChange: (role: UserRole) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function UserFormPage({
  editingUser,
  error,
  form,
  isSaving,
  message,
  onBack,
  onFieldChange,
  onRoleChange,
  onSubmit,
}: UserFormPageProps) {
  const heading = editingUser ? "Editar usuario" : "Crear usuario";
  const eyebrow = editingUser ? "Edición de operador" : "Nuevo operador";

  return (
    <section className="form-route-grid">
      <form className="page-card form-card" onSubmit={onSubmit}>
        <div className="card-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{heading}</h2>
            <p className="section-copy">
              Registra usuarios para la red Domesa y controla el acceso
              administrativo o operativo desde una pantalla dedicada.
            </p>
          </div>
        </div>

        <div className="field-grid">
          <label>
            Correo electrónico
            <input
              type="email"
              value={form.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              placeholder="operador@domesa.com.ve"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                onFieldChange("password", event.target.value)
              }
              placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
              required
            />
          </label>

          <label>
            Rol
            <select
              value={form.role}
              onChange={(event) => onRoleChange(event.target.value as UserRole)}
              disabled={Boolean(editingUser)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}

        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onBack}>
            Volver al dashboard
          </button>
          <button
            className="primary-button primary-button-inline"
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Guardando..."
              : editingUser
                ? "Guardar cambios"
                : "Crear usuario"}
          </button>
        </div>
      </form>

      <aside className="page-card helper-card">
        <p className="eyebrow">Operación</p>
        <h3>Rutas, operadores y control</h3>
        <p className="section-copy">
          Usa esta vista para crear personal administrativo, operadores de
          agencia o distribuidores que gestionan entregas y retiros.
        </p>
        <div className="helper-note">
          <strong>Consejo</strong>
          <span>
            Los usuarios con rol ADMIN mantienen acceso al panel. Los
            responsables de agencia suelen funcionar mejor como DISTRIBUTOR o
            USER según el flujo operativo.
          </span>
        </div>
      </aside>
    </section>
  );
}
