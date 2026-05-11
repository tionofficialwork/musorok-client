import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import OtpCodeInput from "../../components/ui/OtpCodeInput";
import ScreenSection from "../../components/ui/ScreenSection";
import { showAuthCodeNotification } from "../../lib/authCodeNotification";
import { radii, spacing, typography } from "../../lib/theme";
import {
  type AuthFlowMode,
  formatPhoneForDisplay,
  resendOtpCode,
  verifyOtpCode,
} from "../../lib/auth";
import { useAppTheme } from "../../providers/AppThemeProvider";

const RESEND_DELAY_SECONDS = 45;
const OTP_CODE_LENGTH = 6;

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
  const scrollRef = useRef<ScrollView>(null);

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
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + RESEND_DELAY_SECONDS * 1000
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [localCodeNotificationSent, setLocalCodeNotificationSent] =
    useState(false);

  const resendSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - nowMs) / 1000)
  );
  const isCodeValid = useMemo(() => /^\d{6}$/.test(code.trim()), [code]);
  const canResend =
    Boolean(challengeId) && !isSubmitting && !isResending && resendSeconds === 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!localCode) {
      setLocalCodeNotificationSent(false);
      return undefined;
    }

    showAuthCodeNotification(localCode)
      .then((isSent) => {
        if (isMounted) {
          setLocalCodeNotificationSent(isSent);
        }
      })
      .catch((error) => {
        console.warn("Failed to show auth code notification", error);

        if (isMounted) {
          setLocalCodeNotificationSent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [localCode]);

  const handleCodeFocus = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 110, animated: true });
    });
  }, []);

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
      setResendAvailableAt(Date.now() + RESEND_DELAY_SECONDS * 1000);
      setNowMs(Date.now());
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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
            style={styles.flex}
        >
          <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
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
                <Text style={styles.localCodeTitle}>Тестовый код</Text>
                <Text style={styles.localCodeValue}>{localCode}</Text>
                <Text style={styles.localCodeText}>
                  {localCodeNotificationSent
                    ? "Отправили его локальным уведомлением. Если уведомление не видно, код можно взять здесь."
                    : "Пока SMS не подключены, код можно взять здесь."}
                </Text>
              </View>
            ) : null}

            <ScreenSection
                title="Код подтверждения"
                subtitle="Введите 6 цифр из сообщения"
            >
              <AppCard>
                <Text style={styles.label}>Код</Text>

                <OtpCodeInput
                    value={code}
                    onChangeText={setCode}
                    length={OTP_CODE_LENGTH}
                    onFocus={handleCodeFocus}
                    containerStyle={styles.input}
                    focusedContainerStyle={styles.inputFocused}
                    slotStyle={styles.codeSlot}
                    activeSlotStyle={styles.codeSlotActive}
                    textStyle={styles.codeSlotText}
                    placeholderTextStyle={styles.codeSlotPlaceholder}
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
                  title={
                    isResending
                      ? "Отправляем..."
                      : resendSeconds > 0
                        ? `Повторить через ${resendSeconds} сек.`
                        : "Отправить код ещё раз"
                  }
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
      paddingBottom: 180,
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
      minHeight: 84,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    codeSlot: {
      minWidth: 26,
      marginHorizontal: 5,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      fontFamily,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      color: colors.text,
    },
    codeSlotActive: {
      borderBottomColor: colors.primary,
    },
    codeSlotText: {
      color: colors.text,
    },
    codeSlotPlaceholder: {
      color: colors.textMuted,
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
