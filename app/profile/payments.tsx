import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  DEFAULT_PAYMENT_PREFERENCES,
  getPaymentPreferences,
  savePaymentPreferences,
  type PaymentMethod,
} from "../../lib/paymentPreferences";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
}> = [
  {
    id: "card",
    title: "Карта",
    subtitle: "Оплата банковской картой",
  },
  {
    id: "sbp",
    title: "СБП",
    subtitle: "Оплата через Систему быстрых платежей",
  },
];

export default function PaymentsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
      DEFAULT_PAYMENT_PREFERENCES.defaultMethod
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const preferences = await getPaymentPreferences();
      setSelectedMethod(preferences.defaultMethod);
    } catch (error) {
      const message =
          error instanceof Error
              ? error.message
              : "Не удалось загрузить настройки оплаты.";
      Alert.alert("Ошибка", message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await savePaymentPreferences({
        defaultMethod: selectedMethod,
      });
      Alert.alert("Готово", "Способ оплаты сохранён.");
      router.back();
    } catch (error) {
      const message =
          error instanceof Error
              ? error.message
              : "Не удалось сохранить способ оплаты.";
      Alert.alert("Ошибка", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Оплата" }} />

        {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.centerText}>Загружаем способы оплаты...</Text>
            </View>
        ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <ScreenSection title="Способ оплаты">
                <AppCard>
                  <View style={styles.methodsList}>
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = selectedMethod === method.id;

                      return (
                          <Pressable
                              key={method.id}
                              onPress={() => setSelectedMethod(method.id)}
                              style={({ pressed }) => [
                                styles.methodRow,
                                isSelected ? styles.methodRowSelected : undefined,
                                pressed ? styles.methodRowPressed : undefined,
                              ]}
                          >
                            <View style={styles.methodTextWrap}>
                              <Text
                                  style={[
                                    styles.methodTitle,
                                    isSelected ? styles.methodTitleSelected : undefined,
                                  ]}
                              >
                                {method.title}
                              </Text>
                              <Text
                                  style={[
                                    styles.methodSubtitle,
                                    isSelected
                                        ? styles.methodSubtitleSelected
                                        : undefined,
                                  ]}
                              >
                                {method.subtitle}
                              </Text>
                            </View>

                            <View
                                style={[
                                  styles.radio,
                                  isSelected ? styles.radioSelected : undefined,
                                ]}
                            >
                              {isSelected ? <View style={styles.radioDot} /> : null}
                            </View>
                          </Pressable>
                      );
                    })}
                  </View>
                </AppCard>
              </ScreenSection>

              <AppButton
                  title={isSaving ? "Сохраняем..." : "Сохранить"}
                  onPress={handleSave}
                  disabled={isSaving}
              />

              <AppButton
                  title="Назад"
                  variant="secondary"
                  onPress={() => router.back()}
                  disabled={isSaving}
              />
            </ScrollView>
        )}
      </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    centerText: {
      fontSize: typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    methodsList: {
      gap: spacing.sm,
    },
    methodRow: {
      minHeight: 76,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    methodRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    methodRowPressed: {
      opacity: 0.92,
    },
    methodTextWrap: {
      flex: 1,
      gap: 4,
    },
    methodTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    methodTitleSelected: {
      color: colors.primary,
    },
    methodSubtitle: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    methodSubtitleSelected: {
      color: colors.text,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
  });
}
