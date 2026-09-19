import { API_BASE_URL } from './api';

export type AdModalSwipeAction = 'like' | 'unlike' | 'pass';

export async function trackAdModalSwipe(payload: {
  productId: number;
  action: AdModalSwipeAction;
  source?: 'retail_app' | 'b2b_app' | 'website';
  userId?: number | null;
}) {
  try {
    const url = API_BASE_URL.endsWith('/')
      ? `${API_BASE_URL}ad-modal/track`
      : `${API_BASE_URL}/ad-modal/track`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: payload.productId,
        action: payload.action,
        source: payload.source || 'retail_app',
        userId: payload.userId || null,
      }),
    });
    return await response.json();
  } catch (err) {
    // Fire-and-forget: do not block UI on telemetry error
    return null;
  }
}
