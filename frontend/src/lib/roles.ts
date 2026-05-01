import type { UserRole } from '../types';

export const roles: UserRole[] = ['USER', 'ADMIN', 'DISTRIBUTOR'];

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    USER: 'Cliente',
    ADMIN: 'Administrador',
    DISTRIBUTOR: 'Distribuidor'
  };

  return labels[role];
}