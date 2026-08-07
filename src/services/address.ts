import { API_BASE_URL } from './api';

export async function fetchAddresses(userId: number) {
  const response = await fetch(`${API_BASE_URL}addresses/fetch?userId=${userId}`);
  return response.json();
}

export async function fetchStates() {
  const response = await fetch(`${API_BASE_URL}addresses/states`);
  return response.json();
}

export async function createAddress(payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}addresses/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function updateAddress(addressId: number, payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}addresses/update/${addressId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteAddress(addressId: number) {
  const response = await fetch(`${API_BASE_URL}addresses/delete/${addressId}`, {
    method: 'DELETE',
  });
  return response.json();
}
