import { supabase } from "./supabase";
import { getOwnerKey } from "./profileOwner";
import { getProfileOwnerKey } from "./profileIdentity";

export type PaymentMethod = "card";

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
  default_method: string | null;
  allow_cash: boolean | null;
  allow_card: boolean | null;
  default_tip: number | null;
  ask_before_changing_method: boolean | null;
  updated_at: string | null;
};

export const DEFAULT_PAYMENT_PREFERENCES: PaymentPreferences = {
  defaultMethod: "card",
  allowCash: false,
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
    value: Partial<PaymentPreferences> | null | undefined
): PaymentPreferences {
  const allowCard =
      typeof value?.allowCard === "boolean"
          ? value.allowCard
          : DEFAULT_PAYMENT_PREFERENCES.allowCard;

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
    defaultMethod: "card",
    allowCash: false,
    allowCard: allowCard === false ? true : true,
    defaultTip,
    askBeforeChangingMethod,
    updatedAt: value?.updatedAt ?? null,
  };
}

function mapRowToPreferences(row: PaymentPreferencesRow): PaymentPreferences {
  return sanitizePreferences({
    defaultMethod: "card",
    allowCash: false,
    allowCard: row.allow_card !== false,
    defaultTip:
        typeof row.default_tip === "number" ? row.default_tip : DEFAULT_PAYMENT_PREFERENCES.defaultTip,
    askBeforeChangingMethod:
        row.ask_before_changing_method === true,
    updatedAt: row.updated_at,
  });
}

async function getRowByOwnerKey(
    ownerKey: string
): Promise<PaymentPreferencesRow | null> {
  const { data, error } = await supabase
      .from("user_payment_preferences")
      .select(
          "owner_key, default_method, allow_cash, allow_card, default_tip, ask_before_changing_method, updated_at"
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
    profileOwnerKey: string
): Promise<PaymentPreferencesRow> {
  const { data, error } = await supabase
      .from("user_payment_preferences")
      .update({
        owner_key: profileOwnerKey,
        default_method: "card",
        allow_cash: false,
        allow_card: true,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_key", legacyRow.owner_key)
      .select(
          "owner_key, default_method, allow_cash, allow_card, default_tip, ask_before_changing_method, updated_at"
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
    patch: Partial<PaymentPreferences>
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

  const payload = {
    owner_key: profileOwnerKey,
    default_method: "card",
    allow_cash: false,
    allow_card: true,
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