import { api } from "./api";

export type PaymentMethod = "card" | "sbp";

export type PaymentPreferences = {
  defaultMethod: PaymentMethod;
  allowCash: boolean;
  allowCard: boolean;
  defaultTip: number;
  askBeforeChangingMethod: boolean;
  updatedAt: string | null;
};

type PaymentPreferencesRow = {
  default_method?: string | null;
  allow_cash?: boolean | null;
  allow_card?: boolean | null;
  default_tip?: number | null;
  ask_before_changing_method?: boolean | null;
  updated_at?: string | null;
};

export const DEFAULT_PAYMENT_PREFERENCES: PaymentPreferences = {
  defaultMethod: "card",
  allowCash: false,
  allowCard: true,
  defaultTip: 0,
  askBeforeChangingMethod: false,
  updatedAt: null,
};

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
