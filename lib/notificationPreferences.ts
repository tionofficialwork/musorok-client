import { api } from "./api";

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
  order_updates_enabled?: boolean | null;
  promotions_enabled?: boolean | null;
  reminders_enabled?: boolean | null;
  system_enabled?: boolean | null;
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  updated_at?: string | null;
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

function isValidTimeValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
  );
}

function sanitizeNotificationPreferences(
  value: Partial<NotificationPreferences> | null | undefined
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
  row: NotificationPreferencesRow
): NotificationPreferences {
  return sanitizeNotificationPreferences({
    orderUpdatesEnabled: row.order_updates_enabled ?? undefined,
    promotionsEnabled: row.promotions_enabled ?? undefined,
    remindersEnabled: row.reminders_enabled ?? undefined,
    systemEnabled: row.system_enabled ?? undefined,
    quietHoursEnabled: row.quiet_hours_enabled ?? undefined,
    quietHoursStart: row.quiet_hours_start ?? undefined,
    quietHoursEnd: row.quiet_hours_end ?? undefined,
    updatedAt: row.updated_at ?? null,
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { preferences } = await api.notificationPreferences.get();

  if (!preferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return mapRowToPreferences(preferences);
}

export async function saveNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const next = sanitizeNotificationPreferences({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const { preferences } = await api.notificationPreferences.save({
    order_updates_enabled: next.orderUpdatesEnabled,
    promotions_enabled: next.promotionsEnabled,
    reminders_enabled: next.remindersEnabled,
    system_enabled: next.systemEnabled,
    quiet_hours_enabled: next.quietHoursEnabled,
    quiet_hours_start: next.quietHoursStart,
    quiet_hours_end: next.quietHoursEnd,
  });

  return mapRowToPreferences(preferences);
}
