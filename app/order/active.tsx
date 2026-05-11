import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";
import {
  clearActiveOrder,
  getActiveOrder,
  syncActiveOrder,
  type StoredActiveOrder,
} from "../../lib/activeOrder";
import {
  getActiveOrderProgressValue,
  getActiveOrderStatusDescription,
  getActiveOrderStatusMeta,
  getActiveOrderTimelineSteps,
  getOrderStatusLabel,
  getOrderStatusShortLabel,
  isActiveOrderStatus,
  isCompletedActiveOrderTimelineStep,
  isCurrentActiveOrderTimelineStep,
} from "../../lib/orderStatus";
import { api } from "../../lib/api";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import { notifyOrderStatusChanged } from "../../lib/orderNotifications";
import { openOrderPaymentSession } from "../../lib/orderPaymentFlow";
import {
  canOpenPaymentForStatus,
  isPaymentSuccessful,
} from "../../lib/payments";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type OrderRow = {
  id: string | number;
  created_at: string | null;
  status: string | null;
  address: string | null;
  package_id: string | null;
  package_label: string | null;
  package_price: number | null;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  intercom: string | null;
  comment: string | null;
  leave_at_door: boolean | null;
  phone: string | null;
  should_call: boolean | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_id: string | null;
  tip: number | null;
  total: number | null;
  courier_id: string | null;
  call_required: boolean | null;
  owner_key: string | null;
};

type InfoRowProps = {
  label: string;
  value: string;
  rightAligned?: boolean;
  compact?: boolean;
};

type ObservedOrderSnapshot = {
  id: string;
  status: string | null;
};

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningPayment, setIsOpeningPayment] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastObservedOrderRef = useRef<ObservedOrderSnapshot | null>(null);

  const timelineSteps = useMemo(() => getActiveOrderTimelineSteps(), []);
  const statusLabel = getOrderStatusLabel(order?.status ?? null);
  const shortStatusLabel = getOrderStatusShortLabel(order?.status ?? null);
  const orderMeta = getActiveOrderStatusMeta(order?.status ?? null);
  const progressValue = getActiveOrderProgressValue(order?.status ?? null);
  const canOpenPayment =
    Boolean(order?.id) && canOpenPaymentForStatus(order?.payment_status);

  const applyStoredOrder = useCallback(async () => {
    const storedOrder = await getActiveOrder();

    if (storedOrder) {
      const mappedOrder = mapStoredOrderToOrderRow(storedOrder);

      setOrder(mappedOrder);

      if (mappedOrder) {
        lastObservedOrderRef.current = {
          id: String(mappedOrder.id),
          status: mappedOrder.status,
        };
      }

      return true;
    }

    return false;
  }, []);

  const loadActiveOrder = useCallback(
      async (mode: "initial" | "refresh" | "silent" = "initial") => {
        try {
          if (mode === "initial") {
            setIsLoading(true);
            await applyStoredOrder();
          } else if (mode === "refresh") {
            setIsRefreshing(true);
          }

          setErrorText(null);

          const { order } = await api.orders.active();
          const nextOrder = order ? normalizeOrderRow(order) : null;
          const previousOrder = lastObservedOrderRef.current;

          setOrder(nextOrder);

          if (nextOrder) {
            await syncActiveOrder(nextOrder);

            const nextSnapshot = {
              id: String(nextOrder.id),
              status: nextOrder.status,
            };

            if (
              previousOrder &&
              previousOrder.id === nextSnapshot.id &&
              previousOrder.status &&
              nextSnapshot.status &&
              previousOrder.status !== nextSnapshot.status
            ) {
              await notifyOrderStatusChanged(nextOrder);
            }

            lastObservedOrderRef.current = nextSnapshot;
          } else {
            await notifyMissingActiveOrderStatus(previousOrder);
            await clearActiveOrder();
            lastObservedOrderRef.current = null;
          }
        } catch (error: any) {
          const hasStored = await applyStoredOrder();

          const message =
              typeof error?.message === "string"
                  ? error.message
                  : "Не удалось загрузить активный заказ.";

          setErrorText(
              hasStored ? `Показан локально сохранённый заказ. ${message}` : message
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [applyStoredOrder]
  );

  useFocusEffect(
      useCallback(() => {
        loadActiveOrder("initial");

        pollTimerRef.current = setInterval(() => {
          loadActiveOrder("silent");
        }, 15000);

        return () => {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        };
      }, [loadActiveOrder])
  );

  const handleRefresh = () => {
    loadActiveOrder("refresh");
  };

  const handleCreateOrder = () => {
    router.push("/order/package");
  };

  const handleOpenPayment = async () => {
    if (!order?.id || isOpeningPayment) {
      return;
    }

    const orderId = String(order.id);

    try {
      setIsOpeningPayment(true);
      setErrorText(null);

      const checkedPayment = await openOrderPaymentSession(orderId);

      await loadActiveOrder("refresh");

      if (isPaymentSuccessful(checkedPayment)) {
        Alert.alert("Оплата прошла", "Заказ оплачен.");
        return;
      }

      router.replace({
        pathname: "/order/payment-return" as never,
        params: {
          orderId,
          result: checkedPayment.status === "failed" ? "fail" : "pending",
        },
      });
    } catch (error) {
      Alert.alert(
        "Ошибка оплаты",
        error instanceof Error
          ? error.message
          : "Не удалось открыть оплату."
      );
    } finally {
      setIsOpeningPayment(false);
    }
  };

  const handleOpenHistory = () => {
    router.push("/order/history");
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  return (
      <>
        <Stack.Screen options={{ title: "Активный заказ" }} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {isLoading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.centerTitle}>Загружаем активный заказ</Text>
                  <Text style={styles.centerText}>
                    Проверяем сохранённые данные и обновляем заказ.
                  </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                      <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                >
                  {!order ? (
                      <>
                        <View style={styles.hero}>
                          <Text style={styles.eyebrow}>Активный заказ</Text>
                          <Text style={styles.title}>Сейчас заказов в работе нет</Text>
                          <Text style={styles.subtitle}>
                            Когда создашь новый заказ, здесь появятся статус, прогресс и
                            основные детали выполнения.
                          </Text>
                        </View>

                        {errorText ? (
                            <ErrorCard
                                title="Проблема с загрузкой"
                                description={errorText}
                                actionLabel="Повторить"
                                onAction={handleRefresh}
                            />
                        ) : null}

                        <ScreenSection
                            title="Можно сделать дальше"
                            subtitle="Выбери следующий шаг"
                        >
                          <AppCard>
                            <View style={styles.emptyIconWrap}>
                              <Text style={styles.emptyIcon}>🗑️</Text>
                            </View>

                            <Text style={styles.emptyTitle}>Нет заказа в работе</Text>
                            <Text style={styles.emptyText}>
                              Создай новый заказ за пару шагов или открой историю, чтобы
                              повторить прошлый сценарий.
                            </Text>

                            <View style={styles.emptyActions}>
                              <AppButton title="Создать заказ" onPress={handleCreateOrder} />
                              <View style={styles.actionSpacer} />
                              <AppButton
                                  title="Открыть историю"
                                  onPress={handleOpenHistory}
                                  variant="secondary"
                              />
                            </View>
                          </AppCard>
                        </ScreenSection>
                      </>
                  ) : (
                      <>
                        <View style={styles.heroCard}>
                          <View style={styles.heroTopRow}>
                            <View style={styles.heroCopy}>
                              <Text style={styles.eyebrow}>Заказ #{order.id}</Text>
                              <Text style={styles.heroTitle}>{shortStatusLabel}</Text>
                              <Text style={styles.heroSubtitle}>{orderMeta}</Text>
                            </View>

                            <StatusPill status={order.status} label={statusLabel} />
                          </View>

                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Прогресс заказа</Text>
                          </View>

                          <View style={styles.progressTrack}>
                            <View
                                style={[
                                  styles.progressFill,
                                  { width: `${progressValue}%` },
                                ]}
                            />
                          </View>

                          <View style={styles.statusBox}>
                            <Text style={styles.statusBoxTitle}>Что происходит сейчас</Text>
                            <Text style={styles.statusBoxText}>
                              {getActiveOrderStatusDescription(order.status)}
                            </Text>
                          </View>
                        </View>

                        {errorText ? (
                            <ErrorCard
                                title="Проблема с загрузкой"
                                description={errorText}
                                actionLabel="Повторить"
                                onAction={handleRefresh}
                            />
                        ) : null}

                        <ScreenSection title="Этапы выполнения">
                          <AppCard>
                            <View style={styles.timeline}>
                              {timelineSteps.map((step, index) => {
                                const isCurrent = isCurrentActiveOrderTimelineStep(
                                    order.status,
                                    step.status
                                );
                                const isCompleted = isCompletedActiveOrderTimelineStep(
                                    order.status,
                                    step.status
                                );
                                const isLast = index === timelineSteps.length - 1;

                                return (
                                    <View key={step.status} style={styles.timelineItem}>
                                      <View style={styles.timelineRail}>
                                        <View
                                            style={[
                                              styles.timelineDot,
                                              isCompleted ? styles.timelineDotCompleted : undefined,
                                              isCurrent ? styles.timelineDotCurrent : undefined,
                                            ]}
                                        >
                                          {isCompleted ? (
                                              <Text style={styles.timelineDotDone}>✓</Text>
                                          ) : (
                                              <Text
                                                  style={[
                                                    styles.timelineDotIndex,
                                                    isCurrent
                                                        ? styles.timelineDotIndexCurrent
                                                        : undefined,
                                                  ]}
                                              >
                                                {index + 1}
                                              </Text>
                                          )}
                                        </View>

                                        {!isLast ? (
                                            <View
                                                style={[
                                                  styles.timelineLine,
                                                  isCompleted
                                                      ? styles.timelineLineCompleted
                                                      : undefined,
                                                ]}
                                            />
                                        ) : null}
                                      </View>

                                      <View style={styles.timelineContent}>
                                        <Text
                                            style={[
                                              styles.timelineTitle,
                                              isCurrent
                                                  ? styles.timelineTitleCurrent
                                                  : undefined,
                                            ]}
                                        >
                                          {step.shortLabel}
                                        </Text>
                                        <Text style={styles.timelineMeta}>{step.meta}</Text>
                                      </View>
                                    </View>
                                );
                              })}
                            </View>
                          </AppCard>
                        </ScreenSection>

                        <ScreenSection
                            title="Кратко по заказу"
                            subtitle="Главные данные по текущей заявке"
                        >
                          <AppCard>
                            <InfoRow
                                label="Пакет"
                                value={order.package_label || "Не указан"}
                                styles={styles}
                            />
                            <Divider styles={styles} />
                            <InfoRow
                                label="Адрес"
                                value={cleanAddressForDisplay(order.address) || "Не указан"}
                                rightAligned
                                compact
                                styles={styles}
                            />
                            {order.apartment ||
                            order.entrance ||
                            order.floor ||
                            order.intercom ? (
                                <>
                                  <Divider styles={styles} />
                                  <InfoRow
                                      label="Детали адреса"
                                      value={[
                                        order.apartment ? `кв. ${order.apartment}` : "",
                                        order.entrance ? `подъезд ${order.entrance}` : "",
                                        order.floor ? `этаж ${order.floor}` : "",
                                        order.intercom
                                            ? `домофон ${order.intercom}`
                                            : "",
                                      ]
                                          .filter(Boolean)
                                          .join(", ")}
                                      rightAligned
                                      styles={styles}
                                  />
                                </>
                            ) : null}
                            <Divider styles={styles} />
                            <InfoRow
                                label="Телефон"
                                value={order.phone || "Не указан"}
                                styles={styles}
                            />
                          </AppCard>
                        </ScreenSection>

                        {order.comment ||
                        order.leave_at_door ||
                        order.should_call ||
                        order.call_required ? (
                            <ScreenSection
                                title="Детали выполнения"
                                subtitle="Как лучше выполнить этот заказ"
                            >
                              <AppCard>
                                <InfoRow
                                    label="Забрать у двери"
                                    value={order.leave_at_door ? "Да" : "Нет"}
                                    styles={styles}
                                />
                                <Divider styles={styles} />
                                <InfoRow
                                    label="Позвонить заранее"
                                    value={order.should_call || order.call_required ? "Да" : "Нет"}
                                    styles={styles}
                                />

                                {order.comment ? (
                                    <>
                                      <Divider styles={styles} />
                                      <View style={styles.noteBox}>
                                        <Text style={styles.noteTitle}>
                                          Комментарий для курьера
                                        </Text>
                                        <Text style={styles.noteText}>{order.comment}</Text>
                                      </View>
                                    </>
                                ) : null}
                              </AppCard>
                            </ScreenSection>
                        ) : null}

                        <ScreenSection
                            title="Оплата"
                            subtitle="Сумма и выбранный способ оплаты"
                        >
                          <AppCard>
                            <InfoRow
                                label="Способ оплаты"
                                value={formatPaymentMethod(order.payment_method)}
                                styles={styles}
                            />
                            <Divider styles={styles} />
                            <InfoRow
                                label="Статус оплаты"
                                value={formatPaymentStatus(order.payment_status)}
                                styles={styles}
                            />
                            <Divider styles={styles} />
                            <InfoRow
                                label="Стоимость пакета"
                                value={`${Number(order.package_price ?? 0)} ₽`}
                                styles={styles}
                            />
                            <Divider styles={styles} />
                            <InfoRow
                                label="Чаевые"
                                value={`${Number(order.tip ?? 0)} ₽`}
                                styles={styles}
                            />

                            <View style={styles.totalBox}>
                              <Text style={styles.totalLabel}>Итого</Text>
                              <Text style={styles.totalValue}>
                                {Number(order.total ?? 0)} ₽
                              </Text>
                            </View>
                          </AppCard>
                        </ScreenSection>

                        <ScreenSection title="Быстрые действия">
                          <View style={styles.quickActions}>
                            {canOpenPayment ? (
                                <AppButton
                                    title={
                                      isOpeningPayment
                                          ? "Открываем оплату..."
                                          : "Оплатить заказ"
                                    }
                                    onPress={handleOpenPayment}
                                    disabled={isOpeningPayment || isRefreshing}
                                />
                            ) : null}
                            <AppButton title="Обновить статус" onPress={handleRefresh} />
                            <AppButton
                                title="История заказов"
                                variant="secondary"
                                onPress={handleOpenHistory}
                            />
                            <AppButton
                                title="В главное меню"
                                variant="secondary"
                                onPress={handleGoHome}
                            />
                          </View>
                        </ScreenSection>
                      </>
                  )}
                </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </>
  );
}

function InfoRow({
                   label,
                   value,
                   rightAligned = false,
                   compact = false,
                   styles,
                 }: InfoRowProps & { styles: ReturnType<typeof createStyles> }) {
  return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
            style={[
              styles.infoValue,
              rightAligned ? styles.infoValueRight : undefined,
              compact ? styles.infoValueCompact : undefined,
            ]}
        >
          {value}
        </Text>
      </View>
  );
}

function Divider({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.divider} />;
}

async function notifyMissingActiveOrderStatus(
  previousOrder: ObservedOrderSnapshot | null
) {
  if (!previousOrder?.id || !previousOrder.status) {
    return;
  }

  try {
    const { orders } = await api.orders.history();
    const finishedOrder = (orders ?? [])
      .map(normalizeOrderRow)
      .find((candidate) => String(candidate?.id) === previousOrder.id);

    if (
      finishedOrder?.status &&
      finishedOrder.status !== previousOrder.status
    ) {
      await notifyOrderStatusChanged(finishedOrder);
    }
  } catch (error) {
    console.warn("Failed to check terminal order status", error);
  }
}

function mapStoredOrderToOrderRow(order: StoredActiveOrder): OrderRow | null {
  if (order.id === null || order.id === undefined) {
    return null;
  }

  if (!isActiveOrderStatus(order.status ?? null)) {
    return null;
  }

  return {
    id: order.id,
    created_at: order.created_at ?? null,
    status: order.status ?? null,
    address: order.address ?? null,
    package_id: order.package_id ?? null,
    package_label: order.package_label ?? null,
    package_price: order.package_price ?? null,
    apartment: order.apartment ?? null,
    entrance: order.entrance ?? null,
    floor: order.floor ?? null,
    intercom: order.intercom ?? null,
    comment: order.comment ?? null,
    leave_at_door: order.leave_at_door ?? null,
    phone: order.phone ?? null,
    should_call: order.should_call ?? null,
    payment_method: order.payment_method ?? null,
    payment_status: order.payment_status ?? null,
    payment_id: order.payment_id ?? null,
    tip: order.tip ?? null,
    total: order.total ?? null,
    courier_id: order.courier_id ?? null,
    call_required: order.call_required ?? null,
    owner_key: typeof order.owner_key === "string" ? order.owner_key : null,
  };
}

function normalizeOrderRow(value: any): OrderRow | null {
  if (!value?.id) {
    return null;
  }

  return {
    id: value.id,
    created_at: value.created_at ?? null,
    status: value.status ?? null,
    address: value.address ?? null,
    package_id: value.package_id ?? null,
    package_label: value.package_label ?? null,
    package_price: value.package_price ?? null,
    apartment: value.apartment ?? null,
    entrance: value.entrance ?? null,
    floor: value.floor ?? null,
    intercom: value.intercom ?? null,
    comment: value.comment ?? null,
    leave_at_door: value.leave_at_door ?? null,
    phone: value.phone ?? null,
    should_call: value.should_call ?? null,
    payment_method: value.payment_method ?? null,
    payment_status: value.payment_status ?? null,
    payment_id: value.payment_id ?? null,
    tip: value.tip ?? null,
    total: value.total ?? null,
    courier_id: value.courier_id ?? null,
    call_required: value.call_required ?? null,
    owner_key: value.owner_key ?? null,
  };
}

function formatPaymentMethod(paymentMethod: string | null) {
  if (paymentMethod === "cash") {
    return "Наличными";
  }

  if (paymentMethod === "card") {
    return "Карта";
  }

  if (paymentMethod === "sbp") {
    return "СБП";
  }

  return "Не указан";
}

function formatPaymentStatus(paymentStatus: string | null) {
  if (paymentStatus === "confirmed") {
    return "Оплачено";
  }

  if (paymentStatus === "authorized") {
    return "Оплата авторизована";
  }

  if (paymentStatus === "pending") {
    return "Ожидает оплаты";
  }

  if (paymentStatus === "failed") {
    return "Не прошла";
  }

  if (paymentStatus === "cancelled") {
    return "Отменена";
  }

  if (paymentStatus === "amount_mismatch") {
    return "Требует проверки";
  }

  return "Не начата";
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
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
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    centerTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    centerText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: "center",
    },
    hero: {
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    eyebrow: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
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
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    heroCopy: {
      flex: 1,
      gap: 4,
    },
    heroTitle: {
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
    },
    heroSubtitle: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    progressLabel: {
      fontSize: typography.bodySmall,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    progressTrack: {
      height: 10,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
    },
    statusBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    statusBoxTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    statusBoxText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
    },
    timeline: {
      gap: spacing.md,
    },
    timelineItem: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing.md,
    },
    timelineRail: {
      width: 28,
      alignItems: "center",
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineDotCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timelineDotCurrent: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    timelineDotDone: {
      fontSize: 12,
      fontWeight: "900",
      color: colors.white,
    },
    timelineDotIndex: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textSecondary,
    },
    timelineDotIndexCurrent: {
      color: colors.primary,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      marginTop: 6,
      marginBottom: -6,
      backgroundColor: colors.border,
    },
    timelineLineCompleted: {
      backgroundColor: colors.primary,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: spacing.sm,
    },
    timelineTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    timelineTitleCurrent: {
      color: colors.primary,
    },
    timelineMeta: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textMuted,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      alignSelf: "center",
      marginBottom: spacing.sm,
    },
    emptyIcon: {
      fontSize: 32,
    },
    emptyTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: "center",
    },
    emptyActions: {
      marginTop: spacing.lg,
    },
    actionSpacer: {
      height: spacing.sm,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    infoLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: typography.body,
      color: colors.textMuted,
    },
    infoValue: {
      minWidth: 0,
      flexShrink: 1,
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: colors.text,
    },
    infoValueRight: {
      flex: 1,
      textAlign: "right",
    },
    infoValueCompact: {
      fontSize: typography.bodySmall,
      lineHeight: 18,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    noteBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    noteTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    noteText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
    },
    totalBox: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    totalLabel: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    totalValue: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.text,
    },
    quickActions: {
      gap: spacing.sm,
    },
  });
}
