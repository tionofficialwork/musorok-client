import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const API_TOKEN_KEY = "musorok_api_token_v1";
const API_OWNER_KEY = "musorok_api_owner_key_v1";
const REQUEST_TIMEOUT_MS = 20000;
let secureStoreAvailability: Promise<boolean> | null = null;

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is missing");
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export type AuthChallengeResponse = {
  ok: true;
  challengeId: string;
  expiresAt: string;
  mode: "local" | "sms";
  code?: string;
  profile?: any;
};

async function canUseSecureStore() {
  if (!secureStoreAvailability) {
    secureStoreAvailability = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailability;
}

async function setApiToken(token: string) {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(API_TOKEN_KEY, token);
    await AsyncStorage.removeItem(API_TOKEN_KEY);
    return;
  }

  await AsyncStorage.setItem(API_TOKEN_KEY, token);
}

async function deleteApiToken() {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(API_TOKEN_KEY);
  }

  await AsyncStorage.removeItem(API_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth !== false) {
    const token = await getApiToken();

    if (token) {
      headers["X-Musorok-Token"] = token;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Сервер не ответил вовремя. Попробуйте ещё раз.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    if (!response.ok) {
      throw new Error(
        `Сервер временно недоступен (HTTP ${response.status}). Попробуйте позже.`
      );
    }

    throw new Error("Сервер вернул некорректный ответ. Попробуйте позже.");
  }

  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : "Не удалось выполнить запрос.";

    if (response.status === 401 && options.auth !== false) {
      await clearApiSession();
    }

    throw new Error(message);
  }

  return payload as T;
}

export async function setApiSession(token: string, ownerKey: string) {
  await Promise.all([
    setApiToken(token),
    AsyncStorage.setItem(API_OWNER_KEY, ownerKey),
  ]);
}

export async function clearApiSession() {
  await Promise.all([
    deleteApiToken(),
    AsyncStorage.removeItem(API_OWNER_KEY),
  ]);
}

export async function getApiToken() {
  if (await canUseSecureStore()) {
    const token = await SecureStore.getItemAsync(API_TOKEN_KEY);

    if (token) {
      return token;
    }

    const legacyToken = await AsyncStorage.getItem(API_TOKEN_KEY);

    if (legacyToken) {
      await SecureStore.setItemAsync(API_TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(API_TOKEN_KEY);
    }

    return legacyToken;
  }

  return AsyncStorage.getItem(API_TOKEN_KEY);
}

export async function getApiOwnerKey() {
  return AsyncStorage.getItem(API_OWNER_KEY);
}

export const api = {
  request,
  auth: {
    register(phone: string, password: string) {
      return request<AuthChallengeResponse>("/auth/register", {
        method: "POST",
        auth: false,
        body: { phone, password },
      });
    },
    login(phone: string, password: string) {
      return request<AuthChallengeResponse>("/auth/login", {
        method: "POST",
        auth: false,
        body: { phone, password },
      });
    },
    requestCode(phone: string) {
      return request<AuthChallengeResponse>(
        "/auth/request-code",
        {
          method: "POST",
          auth: false,
          body: { phone },
        }
      );
    },
    resendCode(challengeId: string) {
      return request<AuthChallengeResponse>("/auth/resend-code", {
        method: "POST",
        auth: false,
        body: { challengeId },
      });
    },
    verifyCode(challengeId: string, code: string) {
      return request<{ ok: true; token: string; ownerKey: string; profile: any }>(
        "/auth/verify-code",
        {
          method: "POST",
          auth: false,
          body: { challengeId, code },
        }
      );
    },
  },
  profile: {
    get() {
      return request<{ profile: any | null }>("/profile");
    },
    save(payload: Record<string, unknown>) {
      return request<{ profile: any }>("/profile", {
        method: "PUT",
        body: payload,
      });
    },
  },
  addresses: {
    list() {
      return request<{ addresses: any[] }>("/addresses");
    },
    create(payload: Record<string, unknown>) {
      return request<{ address: any }>("/addresses", {
        method: "POST",
        body: payload,
      });
    },
    update(id: string, payload: Record<string, unknown>) {
      return request<{ address: any }>(`/addresses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: payload,
      });
    },
    delete(id: string) {
      return request<{ ok: boolean }>(`/addresses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
  orders: {
    create(payload: Record<string, unknown>) {
      return request<{ order: any }>("/orders", {
        method: "POST",
        body: payload,
      });
    },
    initPayment(id: string) {
      return request<{ payment: any }>(
        `/orders/${encodeURIComponent(id)}/payment/init`,
        {
          method: "POST",
        }
      );
    },
    payment(id: string) {
      return request<{ payment: any }>(
        `/orders/${encodeURIComponent(id)}/payment`
      );
    },
    active() {
      return request<{ order: any | null }>("/orders/active");
    },
    history() {
      return request<{ orders: any[] }>("/orders/history");
    },
  },
  paymentPreferences: {
    get() {
      return request<{ preferences: any | null }>("/payment-preferences");
    },
    save(payload: Record<string, unknown>) {
      return request<{ preferences: any }>("/payment-preferences", {
        method: "PUT",
        body: payload,
      });
    },
  },
  pushTokens: {
    save(payload: Record<string, unknown>) {
      return request<{ ok: true }>("/push-tokens", {
        method: "POST",
        body: payload,
      });
    },
    delete(token: string) {
      return request<{ ok: true }>("/push-tokens", {
        method: "DELETE",
        body: { token },
      });
    },
  },
  notificationPreferences: {
    get() {
      return request<{ preferences: any | null }>("/notification-preferences");
    },
    save(payload: Record<string, unknown>) {
      return request<{ preferences: any }>("/notification-preferences", {
        method: "PUT",
        body: payload,
      });
    },
  },
};

export default api;
