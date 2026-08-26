export const sanitizePhone = (phone: string) => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

export const isValidPhone = (phone: string) => {
  const cleaned = sanitizePhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
};

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
