import { API_BASE_URL } from './api';

export async function addToServerCart(payload: {
  userId: number;
  productId: number;
  quantity: number;
  size?: string | null;
}) {
  const response = await fetch(`${API_BASE_URL}cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function fetchServerCart(userId: number) {
  const response = await fetch(`${API_BASE_URL}cart/fetch/${userId}`);
  return response.json();
}

export async function fetchCartEstimation(userId: number, pincode?: string) {
  const url = pincode
    ? `${API_BASE_URL}cart/estimation/${userId}?delivery_pincode=${encodeURIComponent(pincode)}`
    : `${API_BASE_URL}cart/estimation/${userId}`;
  const response = await fetch(url);
  return response.json();
}

export async function removeFromServerCart(cartItemId: number) {
  const response = await fetch(`${API_BASE_URL}cart/deleteOne/${cartItemId}`, {
    method: 'POST',
  });
  return response.json();
}

export async function updateServerCartQuantity(payload: {
  cartItemId: number;
  quantity: number;
  userId: number;
}) {
  const response = await fetch(`${API_BASE_URL}cart/update-quantity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function removeServerCartItemOrProduct(
  userId: number,
  cartItemId?: number | null,
  productId?: number | string | null,
) {
  try {
    if (cartItemId && Number(cartItemId) > 0) {
      const res = await removeFromServerCart(Number(cartItemId));
      return res;
    }
    if (userId && productId) {
      const cartRes = await fetchServerCart(userId);
      const items = cartRes?.data?.items || cartRes?.data?.cart?.items || [];
      const match = items.find(
        (it: any) => String(it.productId) === String(productId) || String(it.id) === String(productId),
      );
      const targetId = match?.id ?? match?.cartItemId ?? match?.itemId;
      if (targetId) {
        const res = await removeFromServerCart(Number(targetId));
        return res;
      }
    }
  } catch (e) {
    console.error('Failed to remove server cart item:', e);
  }
}

export async function clearServerCart(cartId: number | null) {
  if (!cartId) return;
  const response = await fetch(`${API_BASE_URL}cart/clear/${cartId}`, {
    method: 'POST',
  });
  return response.json();
}

export async function applyCoupon(payload: {
  couponCode: string;
  userId: number;
  cartTotal: number;
}, token?: string | null) {
  const response = await fetch(`${API_BASE_URL}coupons/apply-coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export function normalizeCartEstimationResponse(res: any) {
  const data = res?.data ?? res?.result ?? res?.payload ?? res;
  const estimation = data?.data ?? data ?? null;
  if (!estimation) return null;
  const freight = estimation?.deliveryEstimate?.freight_charge ?? null;
  return {
    ...estimation,
    shippingCharge: estimation.shippingCharge ?? freight,
    shippingPartner: estimation.shippingPartner ?? estimation?.deliveryEstimate?.courier_name ?? null,
  };
}
