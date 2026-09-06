import { API_BASE_URL } from './api';

export async function fetchWishlist(userId: number) {
  const response = await fetch(`${API_BASE_URL}wishlist/fetch/${userId}`);
  return response.json();
}

export async function addToWishlist(payload: { userId: number; productId: number }) {
  const response = await fetch(`${API_BASE_URL}wishlist/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function removeFromWishlist(payload: { userId: number; productId: number }) {
  const response = await fetch(`${API_BASE_URL}wishlist/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
