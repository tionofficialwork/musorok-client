import { supabase } from "./supabase";
import { getOwnerKey } from "./profileOwner";
import { getProfileOwnerKey } from "./profileIdentity";

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

type PaymentIdentity = {
  profileOwnerKey: string;
  legacyOwnerKey: string;
};

async function resolvePaymentIdentity(): Promise<PaymentIdentity> {
  const [profileOwnerKey, legacyOwnerKey] = await Promise.all([
    getProfileOwnerKey(),
    getOwnerKey(),
  ]);

  return {
    profileOwnerKey,
    legacyOwnerKey,
  };
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

async function getRowByOwnerKey(
  ownerKey: string,
): Promise<PaymentPreferencesRow | null> {
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

  return data ?? null;
}

async function migrateLegacyRowToProfileOwnerKey(
  legacyRow: PaymentPreferencesRow,
  profileOwnerKey: string,
): Promise<PaymentPreferencesRow> {
  const { data, error } = await supabase
    .from("user_payment_preferences")
    .update({
      owner_key: profileOwnerKey,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_key", legacyRow.owner_key)
    .select(
      "owner_key, default_method, allow_cash, allow_card, default_tip, ask_before_changing_method, updated_at",
    )
    .single<PaymentPreferencesRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function resolvePaymentRow(): Promise<PaymentPreferencesRow | null> {
  const { profileOwnerKey, legacyOwnerKey } = await resolvePaymentIdentity();

  const primaryRow = await getRowByOwnerKey(profileOwnerKey);

  if (primaryRow) {
    return primaryRow;
  }

  if (!legacyOwnerKey || legacyOwnerKey === profileOwnerKey) {
    return null;
  }

  const legacyRow = await getRowByOwnerKey(legacyOwnerKey);

  if (!legacyRow) {
    return null;
  }

  return migrateLegacyRowToProfileOwnerKey(legacyRow, profileOwnerKey);
}

export async function getPaymentPreferences(): Promise<PaymentPreferences> {
  const row = await resolvePaymentRow();

  if (!row) {
    return DEFAULT_PAYMENT_PREFERENCES;
  }

  return mapRowToPreferences(row);
}

export async function savePaymentPreferences(
  patch: Partial<PaymentPreferences>,
): Promise<PaymentPreferences> {
  const { profileOwnerKey } = await resolvePaymentIdentity();
  const existingRow = await resolvePaymentRow();

  const current = existingRow
    ? mapRowToPreferences(existingRow)
    : DEFAULT_PAYMENT_PREFERENCES;

  const next = sanitizePreferences({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const payload: PaymentPreferencesRow = {
    owner_key: profileOwnerKey,
    default_method: next.defaultMethod,
    allow_cash: next.allowCash,
    allow_card: next.allowCard,
    default_tip: next.defaultTip,
    ask_before_changing_method: next.askBeforeChangingMethod,
    updated_at: next.updatedAt,
  };

  if (existingRow) {
    const { error } = await supabase
      .from("user_payment_preferences")
      .update(payload)
      .eq("owner_key", existingRow.owner_key);

    if (error) {
      throw error;
    }

    return next;
  }

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