import type { ApiErrorResponse, CreateUserPayload, UpdateUserPayload, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data as ApiErrorResponse | null;
    const message = error?.errors?.map((item) => item.message).join('\n') || error?.message || 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

export const usersApi = {
  list: () => request<User[]>('/users'),
  create: (payload: CreateUserPayload) => request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  update: (id: string, payload: UpdateUserPayload) => request<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  remove: (id: string) => request<void>(`/users/${id}`, {
    method: 'DELETE'
  })
};
