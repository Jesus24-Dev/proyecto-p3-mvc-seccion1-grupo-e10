import { ActionIconButton } from "./ActionIconButton";
import { roleLabel } from "../lib/roles";
import type { Agency, User } from "../types";

export type DashboardStats = {
  total: number;
  admins: number;
  distributors: number;
  agencies: number;
  activeAgencies: number;
};

type UsersSectionProps = {
  error: string | null;
  filteredUsers: User[];
  isLoading: boolean;
  message: string | null;
  search: string;
  onCreateUser: () => void;
  onDelete: (user: User) => void;
  onEdit: (user: User) => void;
  onSearchChange: (value: string) => void;
};

type AgenciesSectionProps = {
  agencySearch: string;
  filteredAgencies: Agency[];
  isLoading: boolean;
  onCreateAgency: () => void;
  onAgencySearchChange: (value: string) => void;
  userById: Map<string, User>;
};

type AdminDashboardProps = {
  dashboardError: string | null;
  isLoading: boolean;
  stats: DashboardStats;
  agenciesSection: AgenciesSectionProps;
  usersSection: UsersSectionProps;
};

export function AdminDashboard({
  agenciesSection,
  dashboardError,
  isLoading,
  stats,
  usersSection,
}: AdminDashboardProps) {
  return (
    <>
      <section
        className="stats-grid"
        aria-label="Resumen del panel administrativo"
      >
        <article className="stat-card">
          <span>Total usuarios</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Administradores</span>
          <strong>{stats.admins}</strong>
        </article>
        <article className="stat-card">
          <span>Distribuidores</span>
          <strong>{stats.distributors}</strong>
        </article>
        <article className="stat-card">
          <span>Total agencias</span>
          <strong>{stats.agencies}</strong>
        </article>
        <article className="stat-card">
          <span>Agencias activas</span>
          <strong>{stats.activeAgencies}</strong>
        </article>
      </section>

      {dashboardError && <div className="alert error">{dashboardError}</div>}

      <section className="cta-grid">
        <article className="cta-card cta-card-users">
          <div className="cta-copy">
            <p className="eyebrow">Usuarios</p>
            <h3>Nuevo operador o administrador</h3>
            <p>
              Abre una vista dedicada para crear personal de agencia, operadores
              internos y cuentas administrativas.
            </p>
          </div>
          <button
            className="primary-button primary-button-inline"
            type="button"
            onClick={usersSection.onCreateUser}
          >
            Crear usuario
          </button>
        </article>

        <article className="cta-card cta-card-agencies">
          <div className="cta-copy">
            <p className="eyebrow">Agencias</p>
            <h3>Nueva sucursal Domesa</h3>
            <p>
              Registra una agencia, asigna su responsable y mantiene la red
              logística organizada por ciudad o región.
            </p>
          </div>
          <button
            className="primary-button primary-button-inline"
            type="button"
            onClick={agenciesSection.onCreateAgency}
          >
            Crear agencia
          </button>
        </article>
      </section>

      <section className="dashboard-grid">
        <section className="panel table-panel">
          <div className="panel-toolbar">
            <div>
              <p className="eyebrow">Directorio</p>
              <h2 className="panel-title">Usuarios registrados</h2>
              <p className="panel-copy">
                Gestiona cuentas activas dentro de la red Domesa con acceso
                rapido para editar o eliminar.
              </p>
            </div>
            <input
              className="search-input"
              type="search"
              value={usersSection.search}
              onChange={(event) =>
                usersSection.onSearchChange(event.target.value)
              }
              placeholder="Buscar usuario o rol"
            />
          </div>

          {usersSection.message && (
            <div className="alert success">{usersSection.message}</div>
          )}
          {usersSection.error && (
            <div className="alert error">{usersSection.error}</div>
          )}

          {usersSection.isLoading ? (
            <div className="empty-state">Cargando usuarios...</div>
          ) : usersSection.filteredUsers.length === 0 ? (
            <div className="empty-state">No hay usuarios para mostrar.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>ID</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersSection.filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`role-pill role-${user.role.toLowerCase()}`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="muted-cell">{user.id}</td>
                      <td>
                        <div className="row-actions">
                          <ActionIconButton
                            label={`Editar ${user.email}`}
                            onClick={() => usersSection.onEdit(user)}
                            type="edit"
                          />
                          <ActionIconButton
                            label={`Eliminar ${user.email}`}
                            onClick={() => usersSection.onDelete(user)}
                            tone="danger"
                            type="delete"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel table-panel">
          <div className="panel-toolbar">
            <div>
              <p className="eyebrow">Agencias</p>
              <h2 className="panel-title">Agencias registradas</h2>
              <p className="panel-copy">
                Supervisa la red operativa por ubicación y confirma quién lleva
                la coordinación de cada punto.
              </p>
            </div>
            <input
              className="search-input"
              type="search"
              value={agenciesSection.agencySearch}
              onChange={(event) =>
                agenciesSection.onAgencySearchChange(event.target.value)
              }
              placeholder="Buscar agencia o responsable"
            />
          </div>

          {isLoading ? (
            <div className="empty-state">Cargando agencias...</div>
          ) : agenciesSection.filteredAgencies.length === 0 ? (
            <div className="empty-state">No hay agencias para mostrar.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agencia</th>
                    <th>Ubicación</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {agenciesSection.filteredAgencies.map((agency) => {
                    const owner = agenciesSection.userById.get(agency.user_id);

                    return (
                      <tr key={agency.id}>
                        <td>
                          <strong>{agency.name}</strong>
                          <div className="table-detail muted-copy">
                            {agency.id}
                          </div>
                        </td>
                        <td>{agency.location}</td>
                        <td>
                          <div>{owner?.email ?? "Usuario no disponible"}</div>
                          <div className="table-detail muted-copy">
                            {owner ? roleLabel(owner.role) : "Sin relacion"}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${agency.is_active ? "status-active" : "status-inactive"}`}
                          >
                            {agency.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
