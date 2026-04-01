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
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

const TIME_PRESETS = ["21:00", "22:00", "23:00", "08:00", "09:00", "10:00"];

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    loadPreferences().finally(() => setIsLoading(false));
  }, [loadPreferences]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPreferences();
    setIsRefreshing(false);
  }, [loadPreferences]);

  const persist = useCallback(async (patch: Partial<NotificationPreferences>) => {
    setIsSaving(true);
    try {
      const saved = await saveNotificationPreferences(patch);
      setPreferences(saved);
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (isLoading) {
    return (
        <SafeAreaView style={styles.safeArea}>
          <Stack.Screen options={{ title: "Уведомления" }} />
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Загружаем настройки…</Text>
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
              description="Foundation-слой для будущих push-уведомлений"
          >
            <AppCard>
              <Text style={styles.summaryLabel}>Сводка</Text>
              <Text style={styles.summaryValue}>Настройки активны</Text>
            </AppCard>
          </ScreenSection>

          {errorText ? (
              <ErrorCard title="Ошибка" description={errorText} />
          ) : null}
        </ScrollView>
      </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    centerText: {
      color: colors.textSecondary,
    },
    summaryLabel: {
      color: colors.textSecondary,
    },
    summaryValue: {
      color: colors.text,
      fontWeight: "600",
    },
  });
}