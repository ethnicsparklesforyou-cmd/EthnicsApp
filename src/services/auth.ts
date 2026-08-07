import { API_BASE_URL, type ApiResponse } from './api';

type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  userRole: number;
  [key: string]: unknown;
};

type AuthPayload = {
  user: User;
  token: string;
};

async function postJson<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<T>;
  return { ok: response.ok, json };
}

export async function sendOtp(payload: Record<string, unknown>) {
  return postJson('verify/send-otp', payload);
}

export async function verifyOtp(payload: Record<string, unknown>) {
  return postJson<AuthPayload | { isExist?: boolean }>('verify/confirm-otp', payload);
}

export async function registerWithPhone(payload: { phone: string; accountType: 'retail' | 'b2b' }) {
  return postJson<AuthPayload>('users/register-with-phone', payload);
}

