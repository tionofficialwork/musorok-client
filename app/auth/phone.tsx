import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { radii, spacing, typography } from "../../lib/theme";
import {
  formatPhoneForDisplay,
  getAuthSession,
  getDevOtpCode,
  isDevPhoneAuthBypassEnabled,
  isValidRussianPhone,
  normalizePhoneInput,
  requestOtpCode,
} from "../../lib/auth";
import { useAppTheme } from "../../providers/AppThemeProvider";

export default function AuthPhoneScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => normalizePhoneInput(phone), [phone]);
  const canContinue = isValidRussianPhone(normalizedPhone);
  const isDevBypassEnabled = isDevPhoneAuthBypassEnabled();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await getAuthSession();

        if (!isMounted) {
          return;
        }

        if (session?.verified) {
          router.replace("/");
          return;
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      await requestOtpCode(normalizedPhone);

      router.push({
        pathname: "/auth/verify",
        params: {
          phone: normalizedPhone,
        },
      });
    } catch (error) {
      const message =
          error instanceof Error ? error.message : "Не удалось отправить код.";
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, normalizedPhone, router]);

  if (isCheckingSession) {
    return (
        <SafeAreaView style={styles.safeArea}>
          <Stack.Screen options={{ title: "Вход" }} />
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Проверяем сессию...</Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Вход" }} />

        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
        >
          <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={styles.badge}>
                {isDevBypassEnabled ? "Dev auth mode" : "Auth foundation"}
              </Text>
              <Text style={styles.title}>Вход по номеру телефона</Text>
              <Text style={styles.subtitle}>
                {isDevBypassEnabled
                    ? "Для разработки SMS не отправляется. После продолжения откроется экран ввода тестового кода."
                    : "Это безопасная база для будущего реального OTP через Supabase."}
              </Text>
            </View>

            <ScreenSection
                title="Телефон"
                subtitle="Укажи номер, на который дальше будем отправлять код"
            >
              <AppCard>
                <Text style={styles.label}>Номер телефона</Text>

                <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+7 999 123-45-67"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                />

                <Text style={styles.helperText}>
                  Нормализованный формат:{" "}
                  {formatPhoneForDisplay(normalizedPhone || "+7")}
                </Text>

                {isDevBypassEnabled ? (
                    <View style={styles.devHintBox}>
                      <Text style={styles.devHintTitle}>DEV MODE</Text>
                      <Text style={styles.devHintText}>
                        SMS пока не отправляется. На следующем экране используй код{" "}
                        {getDevOtpCode()}.
                      </Text>
                    </View>
                ) : null}

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
              </AppCard>
            </ScreenSection>

            <ScreenSection
                title="Что дальше"
                subtitle="Следующим шагом откроется экран ввода кода"
            >
              <AppCard>
                <View style={styles.featureList}>
                  <Text style={styles.featureItem}>• экран ввода OTP уже готов</Text>
                  <Text style={styles.featureItem}>• логика пока mock-safe</Text>
                  <Text style={styles.featureItem}>
                    • дальше подключим реальный Supabase auth
                  </Text>
                  {isDevBypassEnabled ? (
                      <Text style={styles.featureItem}>
                        • для разработки код подтверждения: {getDevOtpCode()}
                      </Text>
                  ) : null}
                </View>
              </AppCard>
            </ScreenSection>

            <View style={styles.actions}>
              <AppButton
                  title={isSubmitting ? "Отправляем..." : "Получить код"}
                  onPress={handleSubmit}
                  disabled={isSubmitting || !canContinue}
              />

              <AppButton
                  title="Назад"
                  variant="secondary"
                  onPress={() => router.replace("/")}
                  disabled={isSubmitting}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: typography.body,
      color: colors.textMuted,
      textAlign: "center",
    },
    hero: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textMuted,
    },
    label: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: colors.text,
      fontSize: typography.body,
    },
    helperText: {
      marginTop: spacing.sm,
      fontSize: typography.caption,
      color: colors.textMuted,
    },
    devHintBox: {
      marginTop: spacing.md,
      borderRadius: radii.lg,
      padding: spacing.md,
      backgroundColor: colors.primarySoft,
      gap: spacing.xs,
    },
    devHintTitle: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    devHintText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.text,
    },
    errorText: {
      marginTop: spacing.sm,
      fontSize: typography.body,
      color: colors.errorText,
    },
    featureList: {
      gap: spacing.sm,
    },
    featureItem: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.text,
    },
    actions: {
      gap: spacing.md,
    },
  });
}