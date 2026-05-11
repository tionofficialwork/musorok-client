import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { radii, spacing, typography } from "../../lib/theme";
import {
  type AuthFlowMode,
  formatPhoneForDisplay,
  resendOtpCode,
  verifyOtpCode,
} from "../../lib/auth";
import { useAppTheme } from "../../providers/AppThemeProvider";

const RESEND_DELAY_SECONDS = 45;

export default function AuthVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone?: string;
    flowMode?: string;
    challengeId?: string;
    localCode?: string;
  }>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const phone = typeof params.phone === "string" ? params.phone : "";
  const initialChallengeId =
    typeof params.challengeId === "string" ? params.challengeId : "";
  const initialLocalCode =
    typeof params.localCode === "string" ? params.localCode : "";
  const flowMode: AuthFlowMode =
    params.flowMode === "register" ? "register" : "login";

  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [localCode, setLocalCode] = useState(initialLocalCode);
  const [resendSeconds, setResendSeconds] = useState(RESEND_DELAY_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isCodeValid = useMemo(() => /^\d{4,6}$/.test(code.trim()), [code]);
  const canResend =
    Boolean(challengeId) && !isSubmitting && !isResending && resendSeconds === 0;

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleVerify = useCallback(async () => {
    if (isSubmitting || isResending) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      await verifyOtpCode(phone, code, flowMode, challengeId);
      router.replace("/");
    } catch (error) {
      const message =
          error instanceof Error ? error.message : "Не удалось подтвердить код.";
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [challengeId, code, flowMode, isResending, isSubmitting, phone, router]);

  const handleResend = useCallback(async () => {
    if (!canResend) {
      return;
    }

    setIsResending(true);
    setErrorText(null);

    try {
      const nextChallenge = await resendOtpCode(phone, challengeId);

      setChallengeId(nextChallenge.challengeId);
      setLocalCode(nextChallenge.code ?? "");
      setCode("");
      setResendSeconds(RESEND_DELAY_SECONDS);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось отправить код ещё раз.";
      setErrorText(message);
    } finally {
      setIsResending(false);
    }
  }, [canResend, challengeId, phone]);

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Подтверждение" }} />

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
              <Text style={styles.title}>
                {flowMode === "register" ? "Подтвердите регистрацию" : "Введите код"}
              </Text>
              <Text style={styles.subtitle}>
                Код отправлен на номер {formatPhoneForDisplay(phone)}.
              </Text>
            </View>

            {localCode ? (
              <View style={styles.localCodeCard}>
                <Text style={styles.localCodeTitle}>Временный код</Text>
                <Text style={styles.localCodeValue}>{localCode}</Text>
                <Text style={styles.localCodeText}>
                  Пока SMS-провайдер не подключен, код показывается здесь.
                </Text>
              </View>
            ) : null}

            <ScreenSection
                title="Код подтверждения"
                subtitle="Введите код из 4–6 цифр"
            >
              <AppCard>
                <Text style={styles.label}>Код</Text>

                <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                />

                <Text style={styles.helperText}>
                  {resendSeconds > 0
                    ? `Повторно отправить код можно через ${resendSeconds} сек.`
                    : "Если код не пришёл, отправьте его ещё раз."}
                </Text>

                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
              </AppCard>
            </ScreenSection>

            <View style={styles.actions}>
              <AppButton
                  title={isSubmitting ? "Проверяем..." : "Подтвердить"}
                  onPress={handleVerify}
                  disabled={isSubmitting || isResending || !isCodeValid || !challengeId}
              />

              <AppButton
                  title={isResending ? "Отправляем..." : "Отправить код ещё раз"}
                  variant="secondary"
                  onPress={handleResend}
                  disabled={!canResend}
              />

              <AppButton
                  title="Изменить номер"
                  variant="secondary"
                  onPress={() =>
                      router.replace({
                        pathname: "/auth/phone",
                        params: {
                          resetPhone: "1",
                        },
                      })
                  }
                  disabled={isSubmitting || isResending}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  const fontFamily = typography.fontFamily;

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
    hero: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    title: {
      fontFamily,
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontFamily,
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textMuted,
    },
    localCodeCard: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.xl,
      backgroundColor: colors.primarySoft,
      padding: spacing.lg,
      alignItems: "center",
    },
    localCodeTitle: {
      fontFamily,
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
    },
    localCodeValue: {
      marginTop: spacing.xs,
      fontFamily,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 6,
      paddingLeft: 6,
    },
    localCodeText: {
      marginTop: spacing.xs,
      fontFamily,
      fontSize: typography.caption,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: "center",
    },
    label: {
      fontFamily,
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
      fontFamily,
      fontSize: typography.h2,
      fontWeight: "800",
      letterSpacing: 6,
      textAlign: "center",
      paddingLeft: spacing.md + 6,
    },
    helperText: {
      marginTop: spacing.sm,
      fontFamily,
      fontSize: typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      marginTop: spacing.sm,
      fontFamily,
      fontSize: typography.body,
      color: colors.errorText,
    },
    actions: {
      gap: spacing.md,
    },
  });
}
