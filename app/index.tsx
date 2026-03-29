import { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import AppButton from "../components/ui/AppButton";
import AppCard from "../components/ui/AppCard";
import ScreenSection from "../components/ui/ScreenSection";
import {
  getActiveOrder,
  isActiveOrderStatus,
} from "../lib/activeOrder";
import {
  spacing,
  typography,
} from "../lib/theme";
import { useAppTheme } from "../providers/AppThemeProvider";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  const loadActiveOrderState = useCallback(async () => {
    const activeOrder = await getActiveOrder();
    setHasActiveOrder(isActiveOrderStatus(activeOrder?.status ?? null));
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadActiveOrderState();
      }, [loadActiveOrderState])
  );

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Главная", headerShadowVisible: false }} />

        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
          <AppCard style={styles.hero}>
            <Text style={styles.eyebrow}>MusorOK</Text>
            <Text style={styles.title}>Вынос мусора по кнопке</Text>
            <Text style={styles.subtitle}>
              Создавай заказ за пару секунд, следи за статусом и управляй своими
              адресами и оплатой в одном месте.
            </Text>

            <View style={styles.heroActions}>
              <AppButton
                  title={hasActiveOrder ? "Открыть активный заказ" : "Создать заказ"}
                  onPress={() =>
                      router.push(hasActiveOrder ? "/order/active" : "/order/package")
                  }
              />
            </View>
          </AppCard>

          <ScreenSection
              title="Быстрые действия"
              subtitle="Основные разделы приложения"
          >
            <View style={styles.actions}>
              <AppCard>
                <Text style={styles.actionEmoji}>🗑️</Text>
                <Text style={styles.actionTitle}>Новый заказ</Text>
                <Text style={styles.actionText}>
                  Оформить вынос мусора прямо сейчас
                </Text>
                <View style={styles.actionButtonWrap}>
                  <AppButton
                      title="Открыть"
                      onPress={() => router.push("/order/package")}
                  />
                </View>
              </AppCard>

              <AppCard>
                <Text style={styles.actionEmoji}>📦</Text>
                <Text style={styles.actionTitle}>Активный заказ</Text>
                <Text style={styles.actionText}>
                  Проверить текущий статус и детали заказа
                </Text>
                <View style={styles.actionButtonWrap}>
                  <AppButton
                      title="Открыть"
                      onPress={() => router.push("/order/active")}
                      variant="secondary"
                  />
                </View>
              </AppCard>

              <AppCard>
                <Text style={styles.actionEmoji}>🕘</Text>
                <Text style={styles.actionTitle}>История</Text>
                <Text style={styles.actionText}>
                  Посмотреть завершённые и прошлые заказы
                </Text>
                <View style={styles.actionButtonWrap}>
                  <AppButton
                      title="Открыть"
                      onPress={() => router.push("/order/history")}
                      variant="secondary"
                  />
                </View>
              </AppCard>

              <AppCard>
                <Text style={styles.actionEmoji}>⚙️</Text>
                <Text style={styles.actionTitle}>Профиль</Text>
                <Text style={styles.actionText}>
                  Адреса, оплата и настройки приложения
                </Text>
                <View style={styles.actionButtonWrap}>
                  <AppButton
                      title="Открыть"
                      onPress={() => router.push("/profile")}
                      variant="secondary"
                  />
                </View>
              </AppCard>
            </View>
          </ScreenSection>
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
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    hero: {},
    eyebrow: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    heroActions: {
      marginTop: spacing.lg,
    },
    actions: {
      gap: spacing.md,
    },
    actionEmoji: {
      fontSize: 28,
      marginBottom: spacing.sm,
    },
    actionTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    actionText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    actionButtonWrap: {
      marginTop: spacing.md,
    },
  });
}