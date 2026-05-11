import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

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
import { requestOrderNotificationPermission } from "../../lib/orderNotifications";
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      setErrorText(null);
      const data = await getNotificationPreferences();
      setPreferences(data);
    } catch (error: any) {
      setErrorText(
        error?.message ||
          "Не удалось загрузить настройки уведомлений. Попробуйте ещё раз."
      );
    }
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
      setErrorText(null);
    } catch (error: any) {
      setErrorText(
        error?.message ||
          "Не удалось сохранить настройки уведомлений. Попробуйте ещё раз."
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);

    try {
      const granted = await requestOrderNotificationPermission();

      if (granted) {
        await persist({
          systemEnabled: true,
          orderUpdatesEnabled: true,
        });
      }

      Alert.alert(
        granted ? "Уведомления включены" : "Нет разрешения",
        granted
          ? "Мы будем показывать уведомления при изменении статуса заказа."
          : "Разрешите уведомления в настройках системы, чтобы получать статусы заказа."
      );
    } catch (error: any) {
      setErrorText(
        error?.message ||
          "Не удалось запросить разрешение на уведомления. Попробуйте ещё раз."
      );
    } finally {
      setIsRequestingPermission(false);
    }
  }, [persist]);

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
          description="Статусы заказа и важные сообщения сервиса"
        >
          <AppCard>
            <Text style={styles.summaryLabel}>Сводка</Text>
            <Text style={styles.summaryValue}>
              {!preferences.systemEnabled
                ? "Все уведомления выключены"
                : preferences.orderUpdatesEnabled
                  ? "Уведомления о заказах включены"
                  : "Уведомления о заказах выключены"}
            </Text>
          </AppCard>
        </ScreenSection>

        <ScreenSection title="Заказы">
          <AppCard>
            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Все уведомления</Text>
                <Text style={styles.settingText}>
                  Общий переключатель уведомлений внутри приложения.
                </Text>
              </View>
              <Switch
                value={preferences.systemEnabled}
                onValueChange={(value) => persist({ systemEnabled: value })}
                disabled={isSaving}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>Статусы заказа</Text>
                <Text style={styles.settingText}>
                  Показывать уведомление, когда заказ переходит на новый этап.
                </Text>
              </View>
              <Switch
                value={preferences.orderUpdatesEnabled}
                onValueChange={(value) => persist({ orderUpdatesEnabled: value })}
                disabled={isSaving}
              />
            </View>
          </AppCard>
        </ScreenSection>

        <AppButton
          title={
            isRequestingPermission
              ? "Открываем запрос..."
              : "Разрешить системные уведомления"
          }
          onPress={handleRequestPermission}
          disabled={isRequestingPermission}
        />

        {errorText ? <ErrorCard title="Ошибка" description={errorText} /> : null}

        <AppButton
          title="Назад"
          variant="secondary"
          onPress={() => router.back()}
          disabled={isSaving}
        />
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
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    settingTextWrap: {
      flex: 1,
      gap: 4,
    },
    settingTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    settingText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    settingDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
  });
}
