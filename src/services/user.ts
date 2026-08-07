import { API_BASE_URL } from './api';

export async function updateUser(userId: number, payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function resetPassword(userId: number, payload: { currentPassword: string; newPassword: string }) {
  const response = await fetch(`${API_BASE_URL}users/${userId}/reset-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
