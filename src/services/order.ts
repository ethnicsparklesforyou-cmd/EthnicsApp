import { API_BASE_URL } from './api';

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  // Normalise: backend wraps in { status, data: { ... } } — unwrap one level
  return body?.data !== undefined ? body : { ...body, data: body };
}

export async function verifyContactCheckout(payload: { userId: number }) {
  return postJson(`${API_BASE_URL}verify/verify-contact-checkout`, payload);
}

export async function verifyEmailCheckout(payload: { userId: number }) {
  return postJson(`${API_BASE_URL}verify/verify-email-checkout`, payload);
}

export async function checkoutOrder(payload: Record<string, unknown>) {
  return postJson(`${API_BASE_URL}orders/checkout`, payload);
}

export async function createCodChargeOrder(payload: { userId: number }) {
  return postJson(`${API_BASE_URL}orders/create-cod-charge-order`, payload);
}

export async function cancelPayment(payload: { orderId: number; userId: number }) {
  return postJson(`${API_BASE_URL}orders/cancel-payment`, payload);
}

export async function fetchOrders(userId: number) {
  const response = await fetch(`${API_BASE_URL}orders/userOrders/${userId}`);
  return response.json();
}

/** Fetches order items + tracking + estimationSummary (same as web's GetOrderWithTracking) */
export async function fetchOrderWithTracking(orderId: number, userId: number) {
  const response = await fetch(`${API_BASE_URL}orders/orderItems/${orderId}/${userId}`);
  return response.json();
}

/** Legacy – kept for backward compat */
export async function fetchOrderDetails(orderId: number, userId: number) {
  return fetchOrderWithTracking(orderId, userId);
}

export async function fetchInvoiceByNumber(invoiceNumber: string) {
  const response = await fetch(`${API_BASE_URL}bills/invoice/${invoiceNumber}`);
  return response.json();
}

export async function fetchInvoiceByOrderId(orderId: number) {
  const response = await fetch(`${API_BASE_URL}bills/invoice/order/${orderId}`);
  return response.json();
}

export async function fetchProductReviews(productId: number) {
  const response = await fetch(`${API_BASE_URL}review/product/${productId}`);
  return response.json();
}

export async function addReview(payload: { productId: string; userId: string; rating: number; reviewText: string }) {
  const response = await fetch(`${API_BASE_URL}review/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteReview(payload: { id: number; userId: number }) {
  const response = await fetch(`${API_BASE_URL}review/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
