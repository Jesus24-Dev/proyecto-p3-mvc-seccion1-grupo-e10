import type { ReactNode } from 'react';
import { roleLabel } from '../lib/roles';
import type { AuthSession } from '../types';

type AdminPath = '/admin' | '/admin/users/new' | '/admin/agencies/new';

type AdminShellProps = {
  children: ReactNode;
  currentPath: AdminPath;
  description: string;
  isLoading: boolean;
  onLogout: () => void;
  onNavigate: (path: AdminPath) => void;
  onRefresh?: () => void;
  session: AuthSession;
  title: string;
};

const navigationItems: Array<{ path: AdminPath; label: string }> = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/users/new', label: 'Crear usuario' },
  { path: '/admin/agencies/new', label: 'Crear agencia' },
];

export function AdminShell({ children, currentPath, description, isLoading, onLogout, onNavigate, onRefresh, session, title }: AdminShellProps) {
  return (
    <main className="app-shell admin-shell">
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <span className="brand-stamp">Domesa Venezuela</span>
          <h1 className="admin-title">{title}</h1>
          <p className="admin-copy">{description}</p>
        </div>

        <div className="admin-hero-side">
          <nav className="route-nav" aria-label="Navegación del panel">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`route-link ${currentPath === item.path ? 'route-link-active' : ''}`}
                onClick={() => onNavigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hero-toolbar">
            {onRefresh && (
              <button className="secondary-button" type="button" onClick={onRefresh} disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            )}
            <button className="ghost-button" type="button" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="session-banner">
        <div className="session-meta">
          <span className="eyebrow">Sesión activa</span>
          <strong>{session.user.email}</strong>
        </div>
        <span className={`role-pill role-${session.user.role.toLowerCase()}`}>{roleLabel(session.user.role)}</span>
      </section>

      {children}
    </main>
  );
}