import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import StatusPill from "../components/ui/StatusPill";
import { getActiveOrder, type StoredActiveOrder } from "../lib/activeOrder";
import {
  getActiveOrderProgressValue,
  getActiveOrderStatusMeta,
  getOrderStatusLabel,
  getOrderStatusShortLabel,
  isActiveOrderStatus,
} from "../lib/orderStatus";
import { spacing, typography } from "../lib/theme";
import { useAppTheme } from "../providers/AppThemeProvider";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeOrder, setActiveOrder] = useState<StoredActiveOrder | null>(null);
  const [isLoadingActiveOrder, setIsLoadingActiveOrder] = useState(true);

  const loadActiveOrderState = useCallback(async () => {
    try {
      setIsLoadingActiveOrder(true);

      const storedOrder = await getActiveOrder();

      if (storedOrder && isActiveOrderStatus(storedOrder.status ?? null)) {
        setActiveOrder(storedOrder);
      } else {
        setActiveOrder(null);
      }
    } finally {
      setIsLoadingActiveOrder(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadActiveOrderState();
      }, [loadActiveOrderState])
  );

  const hasActiveOrder = Boolean(
      activeOrder && isActiveOrderStatus(activeOrder.status ?? null)
  );

  const activeOrderStatusLabel = getOrderStatusLabel(activeOrder?.status ?? null);
  const activeOrderShortStatus = getOrderStatusShortLabel(
      activeOrder?.status ?? null
  );
  const activeOrderMeta = getActiveOrderStatusMeta(activeOrder?.status ?? null);
  const activeOrderProgress = getActiveOrderProgressValue(
      activeOrder?.status ?? null
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
              title="Активный заказ"
              subtitle={
                hasActiveOrder
                    ? "Краткое состояние текущего заказа"
                    : "Здесь появится текущий заказ, когда он будет в работе"
              }
          >
            {isLoadingActiveOrder ? (
                <AppCard>
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Проверяем активный заказ...</Text>
                  </View>
                </AppCard>
            ) : hasActiveOrder && activeOrder ? (
                <AppCard>
                  <View style={styles.activeOrderTopRow}>
                    <View style={styles.activeOrderCopy}>
                      <Text style={styles.activeOrderEyebrow}>
                        Заказ #{String(activeOrder.id)}
                      </Text>
                      <Text style={styles.activeOrderTitle}>
                        {activeOrderShortStatus}
                      </Text>
                      <Text style={styles.activeOrderSubtitle}>{activeOrderMeta}</Text>
                    </View>

                    <StatusPill
                        status={activeOrder.status}
                        label={activeOrderStatusLabel}
                    />
                  </View>

                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Прогресс</Text>
                    <Text style={styles.progressValue}>{activeOrderProgress}%</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                        style={[
                          styles.progressFill,
                          { width: `${activeOrderProgress}%` },
                        ]}
                    />
                  </View>

                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Пакет</Text>
                      <Text style={styles.summaryValue}>
                        {activeOrder.package_label || "Не указан"}
                      </Text>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Адрес</Text>
                      <Text style={styles.summaryValue} numberOfLines={2}>
                        {activeOrder.address || "Не указан"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activeOrderActions}>
                    <AppButton
                        title="Открыть заказ"
                        onPress={() => router.push("/order/active")}
                    />
                    <AppButton
                        title="История"
                        variant="secondary"
                        onPress={() => router.push("/order/history")}
                    />
                  </View>
                </AppCard>
            ) : (
                <AppCard>
                  <Text style={styles.emptyOrderTitle}>Сейчас активного заказа нет</Text>
                  <Text style={styles.emptyOrderText}>
                    Когда создашь новый заказ, здесь будут отображаться его статус,
                    прогресс и ключевые детали.
                  </Text>

                  <View style={styles.emptyOrderActions}>
                    <AppButton
                        title="Создать заказ"
                        onPress={() => router.push("/order/package")}
                    />
                  </View>
                </AppCard>
            )}
          </ScreenSection>

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
    loadingState: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    loadingText: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    activeOrderTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    activeOrderCopy: {
      flex: 1,
    },
    activeOrderEyebrow: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    activeOrderTitle: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    activeOrderSubtitle: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    progressLabel: {
      fontSize: typography.bodySmall,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    progressValue: {
      fontSize: typography.bodySmall,
      fontWeight: "800",
      color: colors.text,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
      marginBottom: spacing.md,
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    summaryGrid: {
      gap: spacing.md,
    },
    summaryItem: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: spacing.md,
    },
    summaryLabel: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: spacing.xs,
    },
    summaryValue: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 21,
    },
    activeOrderActions: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    emptyOrderTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    emptyOrderText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    emptyOrderActions: {
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