// ─── Validation ──────────────────────────────────────────────────────────────

export const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone.trim());

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidOtp = (otp: string) => /^\d{6}$/.test(otp);

export const isValidPassword = (pw: string) => pw.length >= 6;

// ─── Formatting ──────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatPhone = (phone: string) =>
  phone.replace(/(\d{5})(\d{5})/, '$1 $2');

export const maskPhone = (phone: string) =>
  phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');

// ─── String helpers ───────────────────────────────────────────────────────────

export const capitalize = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
