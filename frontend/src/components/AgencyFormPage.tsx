import type { FormEvent } from 'react';
import { roleLabel, roles } from '../lib/roles';
import type { CreateAgencyPayload, CreateUserPayload, User, UserRole } from '../types';

type AgencyFormPageProps = {
  agencyError: string | null;
  agencyForm: CreateAgencyPayload;
  agencyMessage: string | null;
  agencyOwnerForm: CreateUserPayload;
  isSavingAgency: boolean;
  isSavingAgencyOwner: boolean;
  onAgencyFieldChange: (field: keyof CreateAgencyPayload, value: string) => void;
  onAgencyOwnerFieldChange: (field: keyof CreateUserPayload, value: string) => void;
  onAgencyOwnerRoleChange: (role: UserRole) => void;
  onAgencyOwnerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAgencySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  selectedOwner: User | null;
  users: User[];
};

export function AgencyFormPage({
  agencyError,
  agencyForm,
  agencyMessage,
  agencyOwnerForm,
  isSavingAgency,
  isSavingAgencyOwner,
  onAgencyFieldChange,
  onAgencyOwnerFieldChange,
  onAgencyOwnerRoleChange,
  onAgencyOwnerSubmit,
  onAgencySubmit,
  onBack,
  selectedOwner,
  users,
}: AgencyFormPageProps) {
  return (
    <section className="form-route-grid form-route-grid-wide">
      <div className="page-card-stack">
        <form className="page-card form-card" onSubmit={onAgencySubmit}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Nueva agencia</p>
              <h2>Crear agencia</h2>
              <p className="section-copy">
                Configura una nueva sucursal o punto operativo dentro de la red Domesa, con ubicación y responsable asignado.
              </p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Nombre de la agencia
              <input
                type="text"
                value={agencyForm.name}
                onChange={(event) => onAgencyFieldChange('name', event.target.value)}
                placeholder="Domesa Valencia Centro"
                required
              />
            </label>

            <label>
              Ubicación
              <input
                type="text"
                value={agencyForm.location}
                onChange={(event) => onAgencyFieldChange('location', event.target.value)}
                placeholder="Valencia, Carabobo"
                required
              />
            </label>

            <label>
              Usuario responsable
              <select
                value={agencyForm.user_id}
                onChange={(event) => onAgencyFieldChange('user_id', event.target.value)}
                disabled={users.length === 0}
                required
              >
                {users.length === 0 ? (
                  <option value="">Crea un usuario primero</option>
                ) : (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} · {roleLabel(user.role)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          {selectedOwner && (
            <div className="helper-note helper-note-inline">
              <strong>Responsable seleccionado</strong>
              <span>{selectedOwner.email} · {roleLabel(selectedOwner.role)}</span>
            </div>
          )}

          {agencyMessage && <div className="alert success">{agencyMessage}</div>}
          {agencyError && <div className="alert error">{agencyError}</div>}

          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onBack}>
              Volver al dashboard
            </button>
            <button className="primary-button primary-button-inline" type="submit" disabled={isSavingAgency || users.length === 0}>
              {isSavingAgency ? 'Creando...' : 'Crear agencia'}
            </button>
          </div>
        </form>

        <form className="page-card helper-card" onSubmit={onAgencyOwnerSubmit}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">Responsable</p>
              <h3>Crear usuario dentro de agencias</h3>
              <p className="section-copy">
                Si la agencia aún no tiene responsable, crea el usuario aquí y quedará disponible de inmediato para la asignación.
              </p>
            </div>
          </div>

          <div className="field-grid compact-field-grid">
            <label>
              Correo del responsable
              <input
                type="email"
                value={agencyOwnerForm.email}
                onChange={(event) => onAgencyOwnerFieldChange('email', event.target.value)}
                placeholder="responsable@domesa.com.ve"
                required
              />
            </label>

            <label>
              Contraseña del responsable
              <input
                type="password"
                value={agencyOwnerForm.password}
                onChange={(event) => onAgencyOwnerFieldChange('password', event.target.value)}
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                required
              />
            </label>

            <label>
              Rol del responsable
              <select value={agencyOwnerForm.role} onChange={(event) => onAgencyOwnerRoleChange(event.target.value as UserRole)}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="secondary-button wide-button" type="submit" disabled={isSavingAgencyOwner}>
            {isSavingAgencyOwner ? 'Creando usuario...' : 'Crear responsable'}
          </button>
        </form>
      </div>
    </section>
  );
}