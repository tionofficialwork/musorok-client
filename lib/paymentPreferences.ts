import { api } from "./api";

export type PaymentMethod = "card" | "sbp";

export type PaymentPreferences = {
  defaultMethod: PaymentMethod;
  allowCash: boolean;
  allowCard: boolean;
  defaultTip: number;
  askBeforeChangingMethod: boolean;
  savedCardLast4: string | null;
  savedCardId: string | null;
  savedCardUpdatedAt: string | null;
  updatedAt: string | null;
};

type PaymentPreferencesRow = {
  default_method?: string | null;
  allow_cash?: boolean | null;
  allow_card?: boolean | null;
  default_tip?: number | null;
  ask_before_changing_method?: boolean | null;
  saved_card_last4?: string | null;
  saved_card_id?: string | null;
  saved_card_updated_at?: string | null;
  updated_at?: string | null;
};

export const DEFAULT_PAYMENT_PREFERENCES: PaymentPreferences = {
  defaultMethod: "card",
  allowCash: false,
  allowCard: true,
  defaultTip: 0,
  askBeforeChangingMethod: false,
  savedCardLast4: null,
  savedCardId: null,
  savedCardUpdatedAt: null,
  updatedAt: null,
};

function normalizeCardLast4(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");

  return digits.length === 4 ? digits : null;
}

function sanitizePreferences(
  value: Partial<PaymentPreferences> | null | undefined
): PaymentPreferences {
  return {
    defaultMethod: value?.defaultMethod === "sbp" ? "sbp" : "card",
    allowCash: false,
    allowCard: true,
    defaultTip:
      typeof value?.defaultTip === "number" &&
      Number.isFinite(value.defaultTip) &&
      value.defaultTip >= 0
        ? Math.round(value.defaultTip)
        : DEFAULT_PAYMENT_PREFERENCES.defaultTip,
    askBeforeChangingMethod: value?.askBeforeChangingMethod === true,
    savedCardLast4: normalizeCardLast4(value?.savedCardLast4),
    savedCardId:
      typeof value?.savedCardId === "string" && value.savedCardId.trim()
        ? value.savedCardId.trim()
        : null,
    savedCardUpdatedAt:
      typeof value?.savedCardUpdatedAt === "string"
        ? value.savedCardUpdatedAt
        : null,
    updatedAt: value?.updatedAt ?? null,
  };
}

function mapRowToPreferences(row: PaymentPreferencesRow): PaymentPreferences {
  return sanitizePreferences({
    defaultMethod: row.default_method === "sbp" ? "sbp" : "card",
    allowCash: false,
    allowCard: row.allow_card !== false,
    defaultTip:
      typeof row.default_tip === "number"
        ? row.default_tip
        : DEFAULT_PAYMENT_PREFERENCES.defaultTip,
    askBeforeChangingMethod: row.ask_before_changing_method === true,
    savedCardLast4: normalizeCardLast4(row.saved_card_last4),
    savedCardId:
      typeof row.saved_card_id === "string" && row.saved_card_id.trim()
        ? row.saved_card_id.trim()
        : null,
    savedCardUpdatedAt:
      typeof row.saved_card_updated_at === "string"
        ? row.saved_card_updated_at
        : null,
    updatedAt: row.updated_at ?? null,
  });
}

export async function getPaymentPreferences(): Promise<PaymentPreferences> {
  const { preferences } = await api.paymentPreferences.get();

  if (!preferences) {
    return DEFAULT_PAYMENT_PREFERENCES;
  }

  return mapRowToPreferences(preferences);
}

export async function clearSavedPaymentCard(): Promise<PaymentPreferences> {
  const { preferences } = await api.paymentPreferences.clearSavedCard();

  if (!preferences) {
    return DEFAULT_PAYMENT_PREFERENCES;
  }

  return mapRowToPreferences(preferences);
}

export async function savePaymentPreferences(
  patch: Partial<PaymentPreferences>
): Promise<PaymentPreferences> {
  const current = await getPaymentPreferences();
  const next = sanitizePreferences({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const { preferences } = await api.paymentPreferences.save({
    default_method: next.defaultMethod,
    default_tip: next.defaultTip,
    ask_before_changing_method: next.askBeforeChangingMethod,
  });

  return mapRowToPreferences(preferences);
}
