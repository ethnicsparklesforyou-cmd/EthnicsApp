import { API_BASE_URL } from './api';

export async function fetchWishlist(userId: number) {
  const response = await fetch(`${API_BASE_URL}wishlist/fetch?userId=${userId}`);
  return response.json();
}

export async function toggleWishlist(payload: { userId: number; productId: number }) {
  const response = await fetch(`${API_BASE_URL}wishlist/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
