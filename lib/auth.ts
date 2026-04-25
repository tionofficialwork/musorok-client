import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type AuthSession = {
  phone: string;
  verified: boolean;
  verifiedAt: string;
};

type DevAuthSession = AuthSession & {
  mode: "dev";
};

/**
 * ⚠️ ВРЕМЕННО ВКЛЮЧЕНО ДЛЯ MVP
 * Это позволяет APK работать без реального SMS
 * После подключения SMS нужно вернуть обратно
 */
const DEV_PHONE_AUTH_BYPASS_ENABLED = true;

const DEV_OTP_CODE = "1234";
const DEV_AUTH_SESSION_KEY = "musorok_dev_auth_session_v1";
const DEV_AUTH_PENDING_PHONE_KEY = "musorok_dev_auth_pending_phone_v1";

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

export function isDevPhoneAuthBypassEnabled() {
  return DEV_PHONE_AUTH_BYPASS_ENABLED;
}

export function getDevOtpCode() {
  return DEV_OTP_CODE;
}

async function getStoredDevAuthSession(): Promise<DevAuthSession | null> {
  if (!DEV_PHONE_AUTH_BYPASS_ENABLED) {
    return null;
  }

  const raw = await AsyncStorage.getItem(DEV_AUTH_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DevAuthSession>;

    if (
        typeof parsed?.phone !== "string" ||
        !isValidRussianPhone(parsed.phone) ||
        parsed?.verified !== true ||
        typeof parsed?.verifiedAt !== "string"
    ) {
      return null;
    }

    return {
      phone: normalizePhoneInput(parsed.phone),
      verified: true,
      verifiedAt: parsed.verifiedAt,
      mode: "dev",
    };
  } catch {
    return null;
  }
}

async function setStoredDevAuthSession(phone: string): Promise<void> {
  const payload: DevAuthSession = {
    phone: normalizePhoneInput(phone),
    verified: true,
    verifiedAt: new Date().toISOString(),
    mode: "dev",
  };

  await AsyncStorage.setItem(DEV_AUTH_SESSION_KEY, JSON.stringify(payload));
}

async function clearStoredDevAuthState(): Promise<void> {
  await AsyncStorage.multiRemove([
    DEV_AUTH_SESSION_KEY,
    DEV_AUTH_PENDING_PHONE_KEY,
  ]);
}

async function setPendingDevPhone(phone: string): Promise<void> {
  if (!DEV_PHONE_AUTH_BYPASS_ENABLED) {
    return;
  }

  await AsyncStorage.setItem(
      DEV_AUTH_PENDING_PHONE_KEY,
      normalizePhoneInput(phone)
  );
}

async function getPendingDevPhone(): Promise<string | null> {
  if (!DEV_PHONE_AUTH_BYPASS_ENABLED) {
    return null;
  }

  const value = await AsyncStorage.getItem(DEV_AUTH_PENDING_PHONE_KEY);

  if (!value || !isValidRussianPhone(value)) {
    return null;
  }

  return normalizePhoneInput(value);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const devSession = await getStoredDevAuthSession();

  if (devSession) {
    return devSession;
  }

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
  await clearStoredDevAuthState();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "Не удалось выйти из аккаунта.");
  }
}

export async function requestOtpCode(
    phone: string
): Promise<{ ok: true; mode: "dev" | "supabase" }> {
  const normalized = normalizePhoneInput(phone);

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Введите корректный номер телефона.");
  }

  // 👉 ВСЕГДА dev режим (важно для APK)
  await setPendingDevPhone(normalized);

  return {
    ok: true,
    mode: "dev",
  };
}

export async function verifyOtpCode(
    phone: string,
    code: string
): Promise<{ ok: true; mode: "dev" | "supabase" }> {
  const normalized = normalizePhoneInput(phone);
  const trimmedCode = code.trim();

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Телефон указан некорректно.");
  }

  if (!/^\d{4,6}$/.test(trimmedCode)) {
    throw new Error("Введите код из 4–6 цифр.");
  }

  const pendingPhone = await getPendingDevPhone();

  if (!pendingPhone || pendingPhone !== normalized) {
    throw new Error("Сначала запросите код заново.");
  }

  if (trimmedCode !== DEV_OTP_CODE) {
    throw new Error(`Неверный код. Используйте ${DEV_OTP_CODE}.`);
  }

  await setStoredDevAuthSession(normalized);
  await AsyncStorage.removeItem(DEV_AUTH_PENDING_PHONE_KEY);

  return {
    ok: true,
    mode: "dev",
  };
}

export default {
  normalizePhoneInput,
  formatPhoneForDisplay,
  isValidRussianPhone,
  isDevPhoneAuthBypassEnabled,
  getDevOtpCode,
  getAuthSession,
  clearAuthSession,
  requestOtpCode,
  verifyOtpCode,
};