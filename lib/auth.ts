import { supabase } from "./supabase";

export type AuthSession = {
  phone: string;
  verified: boolean;
  verifiedAt: string;
};

export function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("8") && digits.length === 11) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (value.trim().startsWith("+") && digits.length >= 11) {
    return `+${digits}`;
  }

  return value.trim();
}

export function formatPhoneForDisplay(value: string) {
  const normalized = normalizePhoneInput(value);
  const digits = normalized.replace(/\D/g, "");

  if (digits.length !== 11 || digits[0] !== "7") {
    return normalized;
  }

  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
    7,
    9
  )}-${digits.slice(9, 11)}`;
}

export function isValidRussianPhone(value: string) {
  const normalized = normalizePhoneInput(value);
  return /^\+7\d{10}$/.test(normalized);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return null;
  }

  const phone =
    typeof session.user.phone === "string" && session.user.phone.length > 0
      ? normalizePhoneInput(session.user.phone)
      : "";

  if (!phone) {
    return null;
  }

  return {
    phone,
    verified: true,
    verifiedAt: new Date().toISOString(),
  };
}

export async function clearAuthSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Не удалось выйти из аккаунта.");
  }
}

export async function requestOtpCode(phone: string): Promise<{ ok: true }> {
  const normalized = normalizePhoneInput(phone);

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Введите корректный номер телефона.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new Error(error.message || "Не удалось отправить код.");
  }

  return { ok: true };
}

export async function verifyOtpCode(
  phone: string,
  code: string
): Promise<{ ok: true }> {
  const normalized = normalizePhoneInput(phone);
  const trimmedCode = code.trim();

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Телефон указан некорректно.");
  }

  if (!/^\d{4,6}$/.test(trimmedCode)) {
    throw new Error("Введите код из 4–6 цифр.");
  }

  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: trimmedCode,
    type: "sms",
  });

  if (error) {
    throw new Error(error.message || "Не удалось подтвердить код.");
  }

  return { ok: true };
}

export default {
  normalizePhoneInput,
  formatPhoneForDisplay,
  isValidRussianPhone,
  getAuthSession,
  clearAuthSession,
  requestOtpCode,
  verifyOtpCode,
};