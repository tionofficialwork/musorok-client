import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "../../lib/notificationPreferences";

const TIME_PRESETS = ["21:00", "22:00", "23:00", "08:00", "09:00", "10:00"];

export default function NotificationsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setErrorText(null);

    const data = await getNotificationPreferences();
    setPreferences(data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        const data = await getNotificationPreferences();

        if (!isMounted) {
          return;
        }

        setPreferences(data);
        setErrorText(null);
      } catch (error) {
        console.error("Failed to bootstrap notification preferences", error);

        if (isMounted) {
          setErrorText("Не удалось загрузить настройки уведомлений.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await loadPreferences();
    } catch (error) {
      console.error("Failed to refresh notification preferences", error);
      setErrorText("Не удалось загрузить настройки уведомлений.");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPreferences]);

  const persist = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      setIsSaving(true);
      setErrorText(null);

      try {
        const saved = await saveNotificationPreferences(patch);
        setPreferences(saved);
      } catch (error) {
        console.error("Failed to save notification preferences", error);
        setErrorText("Не удалось сохранить настройки уведомлений.");
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const toggleField = useCallback(
    async (
      key:
        | "orderUpdatesEnabled"
        | "promotionsEnabled"
        | "remindersEnabled"
        | "systemEnabled"
        | "quietHoursEnabled",
      value: boolean,
    ) => {
      if (isSaving) {
        return;
      }

      await persist({ [key]: value });
    },
    [isSaving, persist],
  );

  const setQuietHoursStart = useCallback(
    async (value: string) => {
      if (isSaving) {
        return;
      }

      await persist({ quietHoursStart: value });
    },
    [isSaving, persist],
  );

  const setQuietHoursEnd = useCallback(
    async (value: string) => {
      if (isSaving) {
        return;
      }

      await persist({ quietHoursEnd: value });
    },
    [isSaving, persist],
  );

  const disableAllMarketing = useCallback(async () => {
    if (isSaving) {
      return;
    }

    Alert.alert(
      "Отключить маркетинговые уведомления?",
      "Промо и напоминания будут выключены, но сервисные уведомления по заказам останутся.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Отключить",
          style: "destructive",
          onPress: () => {
            void persist({
              promotionsEnabled: false,
              remindersEnabled: false,
            });
          },
        },
      ],
    );
  }, [isSaving, persist]);

  const summaryText = useMemo(() => {
    const enabledItems = [
      preferences.orderUpdatesEnabled ? "статусы заказа" : null,
      preferences.systemEnabled ? "системные" : null,
      preferences.promotionsEnabled ? "акции" : null,
      preferences.remindersEnabled ? "напоминания" : null,
    ].filter(Boolean);

    const quietHoursText = preferences.quietHoursEnabled
      ? `Тихие часы: ${preferences.quietHoursStart}–${preferences.quietHoursEnd}`
      : "Тихие часы выключены";

    return `${enabledItems.length > 0 ? enabledItems.join(", ") : "все уведомления выключены"} · ${quietHoursText}`;
  }, [preferences]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Уведомления" }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" />
          <Text style={styles.centerText}>Загружаем настройки уведомлений…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Уведомления" }} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <ScreenSection
          title="Настройки уведомлений"
          description="Foundation-слой для будущих push-уведомлений и сервисных сообщений."
        >
          <AppCard>
            <Text style={styles.summaryLabel}>Сводка</Text>
            <Text style={styles.summaryValue}>{summaryText}</Text>

            {isSaving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator />
                <Text style={styles.savingText}>Сохраняем…</Text>
              </View>
            ) : null}
          </AppCard>
        </ScreenSection>

        {errorText ? (
          <ErrorCard
            title="Ошибка уведомлений"
            description={errorText}
          />
        ) : null}

        <ScreenSection
          title="Сервисные уведомления"
          description="То, что связано с заказом и работой приложения."
        >
          <AppCard>
            <ToggleRow
              title="Статусы заказа"
              description="Создан, принят, в пути, завершён."
              value={preferences.orderUpdatesEnabled}
              onValueChange={(value) =>
                toggleField("orderUpdatesEnabled", value)
              }
              disabled={isSaving}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Системные уведомления"
              description="Важные сообщения о работе приложения и аккаунта."
              value={preferences.systemEnabled}
              onValueChange={(value) => toggleField("systemEnabled", value)}
              disabled={isSaving}
            />
          </AppCard>
        </ScreenSection>

        <ScreenSection
          title="Маркетинг и напоминания"
          description="Неблокирующие уведомления, которые можно гибко отключать."
        >
          <AppCard>
            <ToggleRow
              title="Акции и спецпредложения"
              description="Скидки, промокоды, сезонные предложения."
              value={preferences.promotionsEnabled}
              onValueChange={(value) =>
                toggleField("promotionsEnabled", value)
              }
              disabled={isSaving}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Напоминания"
              description="Напоминания сделать заказ или повторить прошлый сценарий."
              value={preferences.remindersEnabled}
              onValueChange={(value) => toggleField("remindersEnabled", value)}
              disabled={isSaving}
            />

            <View style={styles.buttonGap}>
              <AppButton
                title="Отключить весь маркетинг"
                variant="secondary"
                fullWidth
                onPress={disableAllMarketing}
                disabled={isSaving}
              />
            </View>
          </AppCard>
        </ScreenSection>

        <ScreenSection
          title="Тихие часы"
          description="Foundation для ограничения неважных уведомлений в неудобное время."
        >
          <AppCard>
            <ToggleRow
              title="Включить тихие часы"
              description="В будущем это можно будет использовать в push-логике."
              value={preferences.quietHoursEnabled}
              onValueChange={(value) => toggleField("quietHoursEnabled", value)}
              disabled={isSaving}
            />

            <View style={styles.divider} />

            <Text style={styles.subTitle}>Начало</Text>
            <View style={styles.optionGroup}>
              {TIME_PRESETS.slice(0, 3).map((value) => (
                <ChoiceButton
                  key={value}
                  title={value}
                  isSelected={preferences.quietHoursStart === value}
                  onPress={() => setQuietHoursStart(value)}
                  disabled={isSaving || !preferences.quietHoursEnabled}
                />
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.subTitle}>Конец</Text>
            <View style={styles.optionGroup}>
              {TIME_PRESETS.slice(3).map((value) => (
                <ChoiceButton
                  key={value}
                  title={value}
                  isSelected={preferences.quietHoursEnd === value}
                  onPress={() => setQuietHoursEnd(value)}
                  disabled={isSaving || !preferences.quietHoursEnabled}
                />
              ))}
            </View>
          </AppCard>
        </ScreenSection>

        <ScreenSection
          title="Что дальше"
          description="Этот шаг не включает реальную доставку push-уведомлений."
        >
          <AppCard>
            <Text style={styles.noteText}>
              Следующий безопасный этап — подключить device token flow и позже
              связать реальные события заказа с этим preference-layer.
            </Text>
          </AppCard>
        </ScreenSection>
      </ScrollView>
    </SafeAreaView>
  );
}

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </View>
  );
}

type ChoiceButtonProps = {
  title: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

function ChoiceButton({
  title,
  isSelected,
  onPress,
  disabled = false,
}: ChoiceButtonProps) {
  return (
    <AppButton
      title={title}
      onPress={onPress}
      variant={isSelected ? "primary" : "secondary"}
      disabled={disabled}
      fullWidth
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  centerText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#111827",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  savingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  optionGroup: {
    gap: 12,
  },
  buttonGap: {
    marginTop: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
});