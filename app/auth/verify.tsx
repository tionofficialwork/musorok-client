import { useCallback, useMemo, useState } from "react";
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { colors, radii, spacing, typography } from "../../lib/theme";
import {
  formatPhoneForDisplay,
  getDevOtpCode,
  isDevPhoneAuthBypassEnabled,
  verifyOtpCode,
} from "../../lib/auth";

export default function AuthVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();

  const phone = typeof params.phone === "string" ? params.phone : "";

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isCodeValid = useMemo(() => /^\d{4,6}$/.test(code.trim()), [code]);
  const isDevBypassEnabled = isDevPhoneAuthBypassEnabled();

  const handleVerify = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      await verifyOtpCode(phone, code);
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось подтвердить код.";
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, isSubmitting, phone, router]);

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
            <Text style={styles.badge}>
              {isDevBypassEnabled ? "Dev otp mode" : "OTP shell"}
            </Text>
            <Text style={styles.title}>Введите код</Text>
            <Text style={styles.subtitle}>
              Код отправлен на номер {formatPhoneForDisplay(phone)}.
            </Text>
          </View>

          <ScreenSection
            title="Код подтверждения"
            description="Для foundation достаточно ввести код из 4–6 цифр"
          >
            <AppCard>
              <Text style={styles.label}>Код</Text>

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="1234"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <Text style={styles.helperText}>
                {isDevBypassEnabled
                  ? `DEV MODE: используй код ${getDevOtpCode()}.`
                  : "Сейчас это mock-safe сценарий. На следующем шаге подключим реальную проверку."}
              </Text>

              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </AppCard>
          </ScreenSection>

          <View style={styles.actions}>
            <AppButton
              title={isSubmitting ? "Проверяем..." : "Подтвердить"}
              onPress={handleVerify}
              disabled={isSubmitting || !isCodeValid}
            />

            <AppButton
              title="Изменить номер"
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
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
    fontSize: typography.h2,
    fontWeight: "800",
    letterSpacing: 6,
    textAlign: "center",
  },
  helperText: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  errorText: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: "#ef4444",
  },
  actions: {
    gap: spacing.md,
  },
});