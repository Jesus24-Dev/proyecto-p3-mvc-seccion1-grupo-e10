import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usersApi } from './api';
import type { CreateUserPayload, User, UserRole } from './types';

const roles: UserRole[] = ['USER', 'ADMIN', 'DISTRIBUTOR'];

const emptyForm: CreateUserPayload = {
  email: '',
  password: '',
  role: 'USER'
};

function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    USER: 'Cliente',
    ADMIN: 'Administrador',
    DISTRIBUTOR: 'Distribuidor'
  };

  return labels[role];
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      user.email.toLowerCase().includes(normalizedSearch) || user.role.toLowerCase().includes(normalizedSearch)
    );
  }, [search, users]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role === 'ADMIN').length,
    distributors: users.filter((user) => user.role === 'DISTRIBUTOR').length
  }), [users]);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    try {
      const nextUsers = await usersApi.list();
      setUsers(nextUsers);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    usersApi.list()
      .then((nextUsers) => {
        if (isActive) {
          setUsers(nextUsers);
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar los usuarios.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (editingUser) {
        const updatedUser = await usersApi.update(editingUser.id, {
          email: form.email,
          password: form.password
        });

        setUsers((currentUsers) => currentUsers.map((user) => (user.id === editingUser.id ? updatedUser : user)));
        setMessage('Usuario actualizado correctamente.');
      } else {
        const createdUser = await usersApi.create(form);
        setUsers((currentUsers) => [createdUser, ...currentUsers]);
        setMessage('Usuario creado correctamente.');
      }

      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el usuario.');
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: '',
      role: user.role
    });
    setMessage(null);
    setError(null);
  }

  async function handleDelete(user: User) {
    const shouldDelete = window.confirm(`¿Eliminar el usuario ${user.email}?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await usersApi.remove(user.id);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
      setMessage('Usuario eliminado correctamente.');

      if (editingUser?.id === user.id) {
        resetForm();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar el usuario.');
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Panel administrativo</p>
          <h1>Dr Logistics CA</h1>
          <p className="hero-copy">
            Gestiona usuarios, roles y accesos conectados al API de Express y Prisma.
          </p>
        </div>
        <button className="secondary-button" onClick={() => void loadUsers()} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </section>

      <section className="stats-grid" aria-label="Resumen de usuarios">
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
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Usuarios</p>
              <h2>{editingUser ? 'Editar usuario' : 'Crear usuario'}</h2>
            </div>
            {editingUser && (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>

          <label>
            Correo electrónico
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
              placeholder="usuario@correo.com"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, password: event.target.value }))}
              placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
              required
            />
          </label>

          <label>
            Rol
            <select
              value={form.role}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, role: event.target.value as UserRole }))}
              disabled={Boolean(editingUser)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>

          {editingUser && (
            <p className="form-hint">El API actual permite cambiar correo y contraseña. El rol se conserva.</p>
          )}

          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Directorio</p>
              <h2>Usuarios registrados</h2>
            </div>
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario o rol"
            />
          </div>

          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert error">{error}</div>}

          {isLoading ? (
            <div className="empty-state">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">No hay usuarios para mostrar.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>ID</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-pill role-${user.role.toLowerCase()}`}>{roleLabel(user.role)}</span>
                      </td>
                      <td className="muted-cell">{user.id}</td>
                      <td>
                        <div className="row-actions">
                          <button className="ghost-button" type="button" onClick={() => startEdit(user)}>
                            Editar
                          </button>
                          <button className="danger-button" type="button" onClick={() => void handleDelete(user)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
