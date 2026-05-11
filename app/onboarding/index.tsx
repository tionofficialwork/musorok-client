import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppLogo from "../../components/ui/AppLogo";
import ScreenSection from "../../components/ui/ScreenSection";
import { completeOnboarding, getOnboardingState } from "../../lib/onboarding";
import { getAuthSession } from "../../lib/auth";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type OnboardingStep = {
  emoji: string;
  eyebrow: string;
  title: string;
  description: string;
};

const STEPS: OnboardingStep[] = [
  {
    emoji: "🗑️",
    eyebrow: "Шаг 1",
    title: "Вынос мусора по кнопке",
    description:
        "Оформляй заказ быстро: выбери пакет, укажи адрес и отправь заявку без лишних действий.",
  },
  {
    emoji: "⚡",
    eyebrow: "Шаг 2",
    title: "Повтор заказа за пару секунд",
    description:
        "История заказов помогает снова оформить привычный вынос без повторного заполнения данных.",
  },
  {
    emoji: "🔔",
    eyebrow: "Шаг 3",
    title: "Прозрачный и удобный опыт",
    description:
        "Уведомления, карта и сохранённые данные помогают понимать, что происходит с заказом.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const primaryCtaLabel = useMemo(() => {
    if (isSubmitting) {
      return "Сохраняем...";
    }

    return isLastStep ? "Начать" : "Далее";
  }, [isLastStep, isSubmitting]);

  const loadState = useCallback(async () => {
    setIsChecking(true);

    try {
      const [onboardingState, authSession] = await Promise.all([
        getOnboardingState(),
        getAuthSession(),
      ]);

      setIsCompleted(onboardingState.completed);

      if (onboardingState.completed) {
        router.replace(authSession?.verified ? "/" : "/auth/phone");
        return;
      }
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleFinish = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await completeOnboarding();
      setIsCompleted(true);

      const authSession = await getAuthSession();
      router.replace(authSession?.verified ? "/" : "/auth/phone");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, router]);

  const handlePrimaryPress = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (!isLastStep) {
      setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
      return;
    }

    await handleFinish();
  }, [handleFinish, isLastStep, isSubmitting]);

  const handleSkip = useCallback(async () => {
    await handleFinish();
  }, [handleFinish]);

  if (isChecking) {
    return (
        <SafeAreaView style={styles.safeArea}>
          <Stack.Screen options={{ title: "Добро пожаловать" }} />
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Подготавливаем приложение</Text>
            <Text style={styles.loadingText}>Проверяем состояние первого запуска.</Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Добро пожаловать" }} />

        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <AppLogo size="md" style={styles.heroLogo} />
            <Text style={styles.title}>Добро пожаловать</Text>
            <Text style={styles.subtitle}>
              Коротко покажем, как устроен сервис и почему пользоваться им удобно.
            </Text>
          </View>

          <View style={styles.progressRow}>
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPassed = index < currentStepIndex;

              return (
                  <View
                      key={step.title}
                      style={[
                        styles.progressDot,
                        isActive ? styles.progressDotActive : undefined,
                        isPassed ? styles.progressDotPassed : undefined,
                      ]}
                  />
              );
            })}
          </View>

          <ScreenSection
              title={`${currentStep.eyebrow} из ${STEPS.length}`}
              subtitle="Как МусорОК помогает в обычный день"
          >
            <AppCard>
              <View style={styles.stepIconWrap}>
                <Text style={styles.stepIcon}>{currentStep.emoji}</Text>
              </View>

              <Text style={styles.stepEyebrow}>{currentStep.eyebrow}</Text>
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepDescription}>{currentStep.description}</Text>
            </AppCard>
          </ScreenSection>

          <ScreenSection
              title="Что уже доступно"
              subtitle="Главные действия всегда под рукой"
          >
            <AppCard>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>• создание заказа</Text>
                <Text style={styles.featureItem}>• активный заказ</Text>
                <Text style={styles.featureItem}>• история и повтор заказа</Text>
                <Text style={styles.featureItem}>• профиль, адреса и настройки</Text>
              </View>
            </AppCard>
          </ScreenSection>

          <View style={styles.actions}>
            <AppButton
                title={primaryCtaLabel}
                onPress={handlePrimaryPress}
                disabled={isSubmitting}
            />

            <AppButton
                title="Пропустить"
                variant="secondary"
                onPress={handleSkip}
                disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
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
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    loadingTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
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
    heroLogo: {
      alignSelf: "flex-start",
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
    progressRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    progressDot: {
      flex: 1,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },
    progressDotPassed: {
      backgroundColor: colors.primarySoft,
    },
    stepIconWrap: {
      width: 72,
      height: 72,
      borderRadius: radii.xl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      marginBottom: spacing.md,
    },
    stepIcon: {
      fontSize: 32,
    },
    stepEyebrow: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: spacing.xs,
    },
    stepTitle: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    stepDescription: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textMuted,
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
