import { supabase } from "./supabase";
import { getOwnerKey } from "./profileOwner";
import { getProfileOwnerKey } from "./profileIdentity";

export type NotificationPreferences = {
  orderUpdatesEnabled: boolean;
  promotionsEnabled: boolean;
  remindersEnabled: boolean;
  systemEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  updatedAt: string | null;
};

type NotificationPreferencesRow = {
  owner_key: string;
  order_updates_enabled: boolean;
  promotions_enabled: boolean;
  reminders_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  updated_at: string | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdatesEnabled: true,
  promotionsEnabled: false,
  remindersEnabled: true,
  systemEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "09:00",
  updatedAt: null,
};

type NotificationIdentity = {
  profileOwnerKey: string;
  legacyOwnerKey: string;
};

async function resolveNotificationIdentity(): Promise<NotificationIdentity> {
  const [profileOwnerKey, legacyOwnerKey] = await Promise.all([
    getProfileOwnerKey(),
    getOwnerKey(),
  ]);

  return {
    profileOwnerKey,
    legacyOwnerKey,
  };
}

function isValidTimeValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
  );
}

function sanitizeNotificationPreferences(
  value: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  return {
    orderUpdatesEnabled:
      typeof value?.orderUpdatesEnabled === "boolean"
        ? value.orderUpdatesEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.orderUpdatesEnabled,
    promotionsEnabled:
      typeof value?.promotionsEnabled === "boolean"
        ? value.promotionsEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.promotionsEnabled,
    remindersEnabled:
      typeof value?.remindersEnabled === "boolean"
        ? value.remindersEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.remindersEnabled,
    systemEnabled:
      typeof value?.systemEnabled === "boolean"
        ? value.systemEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.systemEnabled,
    quietHoursEnabled:
      typeof value?.quietHoursEnabled === "boolean"
        ? value.quietHoursEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
    quietHoursStart: isValidTimeValue(value?.quietHoursStart)
      ? value.quietHoursStart
      : DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
    quietHoursEnd: isValidTimeValue(value?.quietHoursEnd)
      ? value.quietHoursEnd
      : DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}

function mapRowToPreferences(
  row: NotificationPreferencesRow,
): NotificationPreferences {
  return sanitizeNotificationPreferences({
    orderUpdatesEnabled: row.order_updates_enabled,
    promotionsEnabled: row.promotions_enabled,
    remindersEnabled: row.reminders_enabled,
    systemEnabled: row.system_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    updatedAt: row.updated_at,
  });
}

async function getRowByOwnerKey(
  ownerKey: string,
): Promise<NotificationPreferencesRow | null> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select(
      "owner_key, order_updates_enabled, promotions_enabled, reminders_enabled, system_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at",
    )
    .eq("owner_key", ownerKey)
    .maybeSingle<NotificationPreferencesRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function migrateLegacyRowToProfileOwnerKey(
  legacyRow: NotificationPreferencesRow,
  profileOwnerKey: string,
): Promise<NotificationPreferencesRow> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .update({
      owner_key: profileOwnerKey,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_key", legacyRow.owner_key)
    .select(
      "owner_key, order_updates_enabled, promotions_enabled, reminders_enabled, system_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at",
    )
    .single<NotificationPreferencesRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function resolveNotificationRow(): Promise<NotificationPreferencesRow | null> {
  const { profileOwnerKey, legacyOwnerKey } = await resolveNotificationIdentity();

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

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const row = await resolveNotificationRow();

  if (!row) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return mapRowToPreferences(row);
}

export async function saveNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const { profileOwnerKey } = await resolveNotificationIdentity();
  const existingRow = await resolveNotificationRow();

  const current = existingRow
    ? mapRowToPreferences(existingRow)
    : DEFAULT_NOTIFICATION_PREFERENCES;

  const next = sanitizeNotificationPreferences({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const payload: NotificationPreferencesRow = {
    owner_key: profileOwnerKey,
    order_updates_enabled: next.orderUpdatesEnabled,
    promotions_enabled: next.promotionsEnabled,
    reminders_enabled: next.remindersEnabled,
    system_enabled: next.systemEnabled,
    quiet_hours_enabled: next.quietHoursEnabled,
    quiet_hours_start: next.quietHoursStart,
    quiet_hours_end: next.quietHoursEnd,
    updated_at: next.updatedAt,
  };

  if (existingRow) {
    const { error } = await supabase
      .from("user_notification_preferences")
      .update(payload)
      .eq("owner_key", existingRow.owner_key);

    if (error) {
      throw error;
    }

    return next;
  }

  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert(payload, {
      onConflict: "owner_key",
    });

  if (error) {
    throw error;
  }

  return next;
}