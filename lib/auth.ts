import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  api,
  type AuthChallengeResponse,
  clearApiSession,
  getApiOwnerKey,
  getApiToken,
  setApiSession,
} from "./api";
import { clearActiveOrder } from "./activeOrder";
import { deleteOrderPushTokenIfPossible } from "./orderNotifications";

export type AuthSession = {
  phone: string;
  verified: boolean;
  verifiedAt: string;
};

export type AuthFlowMode = "login" | "register";

type DevAuthSession = AuthSession & {
  mode?: "api" | "dev";
};

const AUTH_SESSION_KEY = "musorok_auth_session_v1";
const LEGACY_DEV_AUTH_SESSION_KEY = "musorok_dev_auth_session_v1";

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

export function sanitizeRussianPhoneInput(value: string) {
  const trimmed = value.trim();
  const digits = value.replace(/\D/g, "");
  let nationalDigits = digits;

  if (trimmed.startsWith("+7") || digits.startsWith("7") || digits.startsWith("8")) {
    nationalDigits = digits.slice(1);
  }

  return `+7${nationalDigits.slice(0, 10)}`;
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

export function formatRussianPhoneInput(value: string) {
  const sanitized = sanitizeRussianPhoneInput(value);
  const nationalDigits = sanitized.replace(/\D/g, "").slice(1, 11);

  if (!nationalDigits) {
    return "+7";
  }

  const area = nationalDigits.slice(0, 3);
  const first = nationalDigits.slice(3, 6);
  const second = nationalDigits.slice(6, 8);
  const third = nationalDigits.slice(8, 10);

  let result = "+7";

  if (area) {
    result += ` (${area}`;
  }

  if (area.length === 3) {
    result += ")";
  }

  if (first) {
    result += ` ${first}`;
  }

  if (second) {
    result += `-${second}`;
  }

  if (third) {
    result += `-${third}`;
  }

  return result;
}

export function isValidRussianPhone(value: string) {
  const normalized = normalizePhoneInput(value);
  return /^\+7\d{10}$/.test(normalized);
}

async function getStoredDevAuthSession(): Promise<DevAuthSession | null> {
  const raw =
    (await AsyncStorage.getItem(AUTH_SESSION_KEY)) ??
    (await AsyncStorage.getItem(LEGACY_DEV_AUTH_SESSION_KEY));

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
      mode: "api",
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
    mode: "api",
  };

  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
}

async function clearStoredDevAuthState(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_SESSION_KEY,
    LEGACY_DEV_AUTH_SESSION_KEY,
    "musorok_dev_auth_pending_phone_v1",
    "musorok_dev_auth_pending_code_v1",
  ]);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const devSession = await getStoredDevAuthSession();

  if (devSession) {
    const token = await getApiToken();

    if (!token) {
      await clearStoredDevAuthState();
      return null;
    }

    return devSession;
  }

  return null;
}

export async function clearAuthSession(): Promise<void> {
  await deleteOrderPushTokenIfPossible().catch((error) => {
    console.warn("Failed to delete push token on sign out", error);
  });

  await Promise.all([
    clearStoredDevAuthState(),
    clearActiveOrder(),
    clearApiSession(),
  ]);
}

export function validatePassword(value: string) {
  if (value.length < 8) {
    return "Пароль должен быть не короче 8 символов.";
  }

  if (!/[A-Za-zА-Яа-яЁё]/.test(value) || !/\d/.test(value)) {
    return "Пароль должен содержать буквы и цифры.";
  }

  return null;
}

export async function startPasswordAuth(
  phone: string,
  password: string,
  flowMode: AuthFlowMode
): Promise<AuthChallengeResponse> {
  const normalized = normalizePhoneInput(phone);

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Введите корректный номер телефона.");
  }

  if (flowMode === "register") {
    const passwordError = validatePassword(password);

    if (passwordError) {
      throw new Error(passwordError);
    }
  } else if (!password) {
    throw new Error("Введите пароль.");
  }

  const result =
    flowMode === "register"
      ? await api.auth.register(normalized, password)
      : await api.auth.login(normalized, password);

  return result;
}

export async function resendOtpCode(
    phone: string,
    challengeId: string
): Promise<AuthChallengeResponse> {
  const normalized = normalizePhoneInput(phone);

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Телефон указан некорректно.");
  }

  if (!challengeId) {
    throw new Error("Запросите код заново.");
  }

  return api.auth.resendCode(challengeId);
}

export async function verifyOtpCode(
    phone: string,
    code: string,
    _flowMode: AuthFlowMode = "login",
    challengeId = ""
): Promise<{ ok: true; mode: "local" | "sms" }> {
  const normalized = normalizePhoneInput(phone);
  const trimmedCode = code.trim();

  if (!isValidRussianPhone(normalized)) {
    throw new Error("Телефон указан некорректно.");
  }

  if (!/^\d{4,6}$/.test(trimmedCode)) {
    throw new Error("Введите код из 4–6 цифр.");
  }

  if (!challengeId) {
    throw new Error("Запросите код заново.");
  }

  const result = await api.auth.verifyCode(challengeId, trimmedCode);

  await setApiSession(result.token, result.ownerKey);
  await setStoredDevAuthSession(normalized);

  return {
    ok: true,
    mode: "sms",
  };
}

export function getPhoneOwnerKey(phone: string) {
  const digits = normalizePhoneInput(phone).replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return `phone_user_${digits}`;
}

export async function getStoredAuthOwnerKey(): Promise<string | null> {
  const session = await getAuthSession();

  if (!session?.phone) {
    return null;
  }

  const apiOwnerKey = await getApiOwnerKey();

  return apiOwnerKey ?? getPhoneOwnerKey(session.phone);
}

export default {
  normalizePhoneInput,
  sanitizeRussianPhoneInput,
  formatPhoneForDisplay,
  formatRussianPhoneInput,
  isValidRussianPhone,
  getAuthSession,
  clearAuthSession,
  startPasswordAuth,
  validatePassword,
  resendOtpCode,
  verifyOtpCode,
  getPhoneOwnerKey,
  getStoredAuthOwnerKey,
};
