import { supabase } from "./supabase";
import * as ProfileOwner from "./profileOwner";

export type PaymentMethod = "cash" | "card";

export type PaymentPreferences = {
  defaultMethod: PaymentMethod;
  allowCash: boolean;
  allowCard: boolean;
  defaultTip: number;
  askBeforeChangingMethod: boolean;
  updatedAt: string | null;
};

type PaymentPreferencesRow = {
  owner_key: string;
  default_method: PaymentMethod;
  allow_cash: boolean;
  allow_card: boolean;
  default_tip: number;
  ask_before_changing_method: boolean;
  updated_at: string | null;
};

export const DEFAULT_PAYMENT_PREFERENCES: PaymentPreferences = {
  defaultMethod: "card",
  allowCash: true,
  allowCard: true,
  defaultTip: 0,
  askBeforeChangingMethod: false,
  updatedAt: null,
};

async function resolveOwnerKey(): Promise<string> {
  const candidates = [
    "getProfileOwnerKey",
    "ensureProfileOwnerKey",
    "getOrCreateProfileOwnerKey",
    "getOwnerKey",
    "getOrCreateOwnerKey",
  ];

  const moduleMap = ProfileOwner as Record<string, unknown>;

  for (const candidate of candidates) {
    const maybeFn = moduleMap[candidate];

    if (typeof maybeFn === "function") {
      const result = await (maybeFn as () => Promise<string>)();

      if (typeof result === "string" && result.length > 0) {
        return result;
      }
    }
  }

  throw new Error(
    "Owner key resolver not found in lib/profileOwner.ts. Expected one of: getProfileOwnerKey / ensureProfileOwnerKey / getOrCreateProfileOwnerKey / getOwnerKey / getOrCreateOwnerKey",
  );
}

function sanitizePreferences(
  value: Partial<PaymentPreferences> | null | undefined,
): PaymentPreferences {
  const allowCash =
    typeof value?.allowCash === "boolean"
      ? value.allowCash
      : DEFAULT_PAYMENT_PREFERENCES.allowCash;

  const allowCard =
    typeof value?.allowCard === "boolean"
      ? value.allowCard
      : DEFAULT_PAYMENT_PREFERENCES.allowCard;

  let defaultMethod: PaymentMethod =
    value?.defaultMethod === "cash" || value?.defaultMethod === "card"
      ? value.defaultMethod
      : DEFAULT_PAYMENT_PREFERENCES.defaultMethod;

  if (!allowCash && allowCard) {
    defaultMethod = "card";
  }

  if (!allowCard && allowCash) {
    defaultMethod = "cash";
  }

  if (!allowCash && !allowCard) {
    return {
      ...DEFAULT_PAYMENT_PREFERENCES,
      updatedAt: value?.updatedAt ?? null,
    };
  }

  const defaultTip =
    typeof value?.defaultTip === "number" &&
    Number.isFinite(value.defaultTip) &&
    value.defaultTip >= 0
      ? Math.round(value.defaultTip)
      : DEFAULT_PAYMENT_PREFERENCES.defaultTip;

  const askBeforeChangingMethod =
    typeof value?.askBeforeChangingMethod === "boolean"
      ? value.askBeforeChangingMethod
      : DEFAULT_PAYMENT_PREFERENCES.askBeforeChangingMethod;

  return {
    defaultMethod,
    allowCash,
    allowCard,
    defaultTip,
    askBeforeChangingMethod,
    updatedAt: value?.updatedAt ?? null,
  };
}

function mapRowToPreferences(row: PaymentPreferencesRow): PaymentPreferences {
  return sanitizePreferences({
    defaultMethod: row.default_method,
    allowCash: row.allow_cash,
    allowCard: row.allow_card,
    defaultTip: row.default_tip,
    askBeforeChangingMethod: row.ask_before_changing_method,
    updatedAt: row.updated_at,
  });
}

export async function getPaymentPreferences(): Promise<PaymentPreferences> {
  const ownerKey = await resolveOwnerKey();

  const { data, error } = await supabase
    .from("user_payment_preferences")
    .select(
      "owner_key, default_method, allow_cash, allow_card, default_tip, ask_before_changing_method, updated_at",
    )
    .eq("owner_key", ownerKey)
    .maybeSingle<PaymentPreferencesRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return DEFAULT_PAYMENT_PREFERENCES;
  }

  return mapRowToPreferences(data);
}

export async function savePaymentPreferences(
  patch: Partial<PaymentPreferences>,
): Promise<PaymentPreferences> {
  const ownerKey = await resolveOwnerKey();
  const current = await getPaymentPreferences();

  const next = sanitizePreferences({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const payload: PaymentPreferencesRow = {
    owner_key: ownerKey,
    default_method: next.defaultMethod,
    allow_cash: next.allowCash,
    allow_card: next.allowCard,
    default_tip: next.defaultTip,
    ask_before_changing_method: next.askBeforeChangingMethod,
    updated_at: next.updatedAt,
  };

  const { error } = await supabase
    .from("user_payment_preferences")
    .upsert(payload, {
      onConflict: "owner_key",
    });

  if (error) {
    throw error;
  }

  return next;
}