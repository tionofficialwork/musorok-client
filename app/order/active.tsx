import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  type ActiveOrderTimelineStep,
} from "../../lib/orderStatus";
import { api, getApiToken } from "../../lib/api";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import { notifyOrderStatusChanged } from "../../lib/orderNotifications";
import { openOrderPaymentSession } from "../../lib/orderPaymentFlow";
import {
  canOpenPaymentForStatus,
  getPaymentStatusLabel,
  isPaymentSuccessful,
  isPaymentStatusSuccessful,
} from "../../lib/payments";
import {
  getOrderPhotoFileUrl,
  type OrderPhoto,
} from "../../lib/orderPhotos";
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

type PaymentBlockingPresentation = {
  title: string;
  subtitle: string;
  statusBoxTitle: string;
  statusBoxText: string;
  progressLabel: string;
  progressValue: number;
  timelineLabel: string;
  timelineMeta: string;
  pillStatus: string | null;
};

type DisplayTimelinePaymentStep = {
  key: string;
  shortLabel: string;
  meta: string;
  kind: "payment";
};

type DisplayTimelineOrderStep = {
  key: string;
  shortLabel: string;
  meta: string;
  status: ActiveOrderTimelineStep["status"];
  kind: "order";
};

type DisplayTimelineStep = DisplayTimelinePaymentStep | DisplayTimelineOrderStep;

export default function ActiveOrderScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningPayment, setIsOpeningPayment] = useState(false);
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [orderPhotos, setOrderPhotos] = useState<OrderPhoto[]>([]);
  const [imageAuthToken, setImageAuthToken] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastObservedOrderRef = useRef<ObservedOrderSnapshot | null>(null);

  const timelineSteps = useMemo(() => getActiveOrderTimelineSteps(), []);
  const statusLabel = getOrderStatusLabel(order?.status ?? null);
  const shortStatusLabel = getOrderStatusShortLabel(order?.status ?? null);
  const orderMeta = getActiveOrderStatusMeta(order?.status ?? null);
  const progressValue = getActiveOrderProgressValue(order?.status ?? null);
  const isPaymentConfirmed = isPaymentStatusSuccessful(order?.payment_status);
  const isWaitingForPayment = Boolean(order) && !isPaymentConfirmed;
  const paymentPresentation = useMemo(
    () => getPaymentBlockingPresentation(order?.payment_status),
    [order?.payment_status]
  );
  const displayTitle = isWaitingForPayment
    ? paymentPresentation.title
    : shortStatusLabel;
  const displaySubtitle = isWaitingForPayment
    ? paymentPresentation.subtitle
    : orderMeta;
  const displayStatusLabel = isWaitingForPayment
    ? getPaymentStatusLabel(order?.payment_status)
    : statusLabel;
  const displayStatusPillStatus = isWaitingForPayment
    ? paymentPresentation.pillStatus
    : order?.status ?? null;
  const displayProgressLabel = isWaitingForPayment
    ? paymentPresentation.progressLabel
    : "Прогресс заказа";
  const displayProgressValue = isWaitingForPayment
    ? paymentPresentation.progressValue
    : progressValue;
  const displayStatusBoxTitle = isWaitingForPayment
    ? paymentPresentation.statusBoxTitle
    : "Что происходит сейчас";
  const displayStatusBoxText = isWaitingForPayment
    ? paymentPresentation.statusBoxText
    : getActiveOrderStatusDescription(order?.status ?? null);
  const displayTimelineSteps = useMemo<DisplayTimelineStep[]>(() => {
    const orderSteps = timelineSteps.map((step) => ({
      key: step.status,
      shortLabel: step.shortLabel,
      meta: step.meta,
      status: step.status,
      kind: "order" as const,
    }));

    if (!isWaitingForPayment) {
      return orderSteps;
    }

    return [
      {
        key: "payment",
        shortLabel: paymentPresentation.timelineLabel,
        meta: paymentPresentation.timelineMeta,
        kind: "payment" as const,
      },
      ...orderSteps,
    ];
  }, [isWaitingForPayment, paymentPresentation, timelineSteps]);
  const canOpenPayment =
    Boolean(order?.id) && canOpenPaymentForStatus(order?.payment_status);
  const clientBeforePhoto = orderPhotos.find(
      (photo) => photo.kind === "client_before"
  );
  const courierAfterPhoto = orderPhotos.find(
      (photo) => photo.kind === "courier_after"
  );
  const canConfirmCompletion =
      Boolean(order?.id && courierAfterPhoto) &&
      isPaymentConfirmed &&
      order?.status !== "done" &&
      order?.status !== "cancelled";

  useEffect(() => {
    let isMounted = true;

    getApiToken()
      .then((token) => {
        if (isMounted) {
          setImageAuthToken(token ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setImageAuthToken(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadOrderPhotos = useCallback(async (orderId: string | number) => {
    try {
      const { photos } = await api.orders.photos(String(orderId));
      setOrderPhotos(Array.isArray(photos) ? normalizeOrderPhotos(photos) : []);
    } catch (error) {
      console.warn("Failed to load order photos", error);
      setOrderPhotos([]);
    }
  }, []);

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
            await loadOrderPhotos(nextOrder.id);

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
            setOrderPhotos([]);
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
      [applyStoredOrder, loadOrderPhotos]
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

  const handleConfirmCompletion = async () => {
    if (!order?.id || isConfirmingCompletion) {
      return;
    }

    try {
      setIsConfirmingCompletion(true);
      setErrorText(null);
      await api.orders.confirmCompletion(String(order.id));
      Alert.alert(
          "Спасибо",
          "Выполнение подтверждено. Заказ перенесён в историю."
      );
      await loadActiveOrder("refresh");
    } catch (error) {
      Alert.alert(
          "Не удалось подтвердить",
          error instanceof Error
              ? error.message
              : "Попробуй обновить заказ и повторить ещё раз."
      );
    } finally {
      setIsConfirmingCompletion(false);
    }
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
                              <Text style={styles.heroTitle}>{displayTitle}</Text>
                              <Text style={styles.heroSubtitle}>{displaySubtitle}</Text>
                            </View>

                            <StatusPill
                                status={displayStatusPillStatus}
                                label={displayStatusLabel}
                            />
                          </View>

                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>
                              {displayProgressLabel}
                            </Text>
                          </View>

                          <View style={styles.progressTrack}>
                            <View
                                style={[
                                  styles.progressFill,
                                  { width: `${displayProgressValue}%` },
                                ]}
                            />
                          </View>

                          <View style={styles.statusBox}>
                            <Text style={styles.statusBoxTitle}>
                              {displayStatusBoxTitle}
                            </Text>
                            <Text style={styles.statusBoxText}>{displayStatusBoxText}</Text>
                          </View>

                          {isWaitingForPayment && canOpenPayment ? (
                              <View style={styles.heroAction}>
                                <AppButton
                                    title={getPaymentActionTitle(
                                      order.payment_status,
                                      isOpeningPayment
                                    )}
                                    onPress={handleOpenPayment}
                                    disabled={isOpeningPayment || isRefreshing}
                                />
                              </View>
                          ) : null}
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
                              {displayTimelineSteps.map((step, index) => {
                                const isPaymentStep = step.kind === "payment";
                                const isMuted =
                                    isWaitingForPayment && step.kind === "order";
                                const isCurrent = isPaymentStep
                                    ? isWaitingForPayment
                                    : !isWaitingForPayment &&
                                      isCurrentActiveOrderTimelineStep(
                                          order.status,
                                          step.status
                                      );
                                const isCompleted = isPaymentStep
                                    ? !isWaitingForPayment
                                    : !isWaitingForPayment &&
                                      isCompletedActiveOrderTimelineStep(
                                          order.status,
                                          step.status
                                      );
                                const isLast = index === displayTimelineSteps.length - 1;

                                return (
                                    <View key={step.key} style={styles.timelineItem}>
                                      <View style={styles.timelineRail}>
                                        <View
                                            style={[
                                              styles.timelineDot,
                                              isCompleted ? styles.timelineDotCompleted : undefined,
                                              isCurrent ? styles.timelineDotCurrent : undefined,
                                              isMuted ? styles.timelineDotMuted : undefined,
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
                                                    isMuted
                                                        ? styles.timelineDotIndexMuted
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
                                                  isMuted ? styles.timelineLineMuted : undefined,
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
                                              isMuted ? styles.timelineTitleMuted : undefined,
                                            ]}
                                        >
                                          {step.shortLabel}
                                        </Text>
                                        <Text
                                            style={[
                                              styles.timelineMeta,
                                              isMuted ? styles.timelineMetaMuted : undefined,
                                            ]}
                                        >
                                          {step.meta}
                                        </Text>
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
                            title="Фото и подтверждение"
                            subtitle="Снимки помогают честно закрыть заказ и решить спорные ситуации"
                        >
                          <AppCard>
                            {clientBeforePhoto ? (
                                <OrderPhotoPreview
                                    orderId={String(order.id)}
                                    photo={clientBeforePhoto}
                                    title="Фото при заказе"
                                    subtitle="Снимок, который клиент прикрепил перед оплатой"
                                    imageAuthToken={imageAuthToken}
                                    styles={styles}
                                />
                            ) : (
                                <View style={styles.photoEmptyBox}>
                                  <Text style={styles.photoEmptyTitle}>
                                    Фото при заказе не найдено
                                  </Text>
                                  <Text style={styles.photoEmptyText}>
                                    Новые заказы будут просить добавить снимок пакетов
                                    перед оформлением.
                                  </Text>
                                </View>
                            )}

                            <Divider styles={styles} />

                            {courierAfterPhoto ? (
                                <>
                                  <OrderPhotoPreview
                                      orderId={String(order.id)}
                                      photo={courierAfterPhoto}
                                      title="Фото после выноса"
                                      subtitle="Проверь снимок от курьера перед закрытием заказа"
                                      imageAuthToken={imageAuthToken}
                                      styles={styles}
                                  />

                                  <View style={styles.completionBox}>
                                    <Text style={styles.completionTitle}>
                                      Всё выглядит правильно?
                                    </Text>
                                    <Text style={styles.completionText}>
                                      Подтверди выполнение, если пакеты вынесены и фото
                                      совпадает с заказом.
                                    </Text>
                                    <View style={styles.completionAction}>
                                      <AppButton
                                          title={
                                            isConfirmingCompletion
                                                ? "Подтверждаем..."
                                                : "Подтвердить выполнение"
                                          }
                                          onPress={handleConfirmCompletion}
                                          disabled={
                                            !canConfirmCompletion ||
                                            isConfirmingCompletion ||
                                            isRefreshing
                                          }
                                      />
                                    </View>
                                  </View>
                                </>
                            ) : (
                                <View style={styles.photoWaitingBox}>
                                  <Text style={styles.photoWaitingTitle}>
                                    Ждём фото от курьера
                                  </Text>
                                  <Text style={styles.photoWaitingText}>
                                    Когда курьер загрузит финальный снимок, он появится
                                    здесь для подтверждения.
                                  </Text>
                                </View>
                            )}
                          </AppCard>
                        </ScreenSection>

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
                                value={getPaymentStatusLabel(order.payment_status)}
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
                            {canOpenPayment && !isWaitingForPayment ? (
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

function OrderPhotoPreview({
                             orderId,
                             photo,
                             title,
                             subtitle,
                             imageAuthToken,
                             styles,
                           }: {
  orderId: string;
  photo: OrderPhoto;
  title: string;
  subtitle: string;
  imageAuthToken: string | null;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
      <View style={styles.photoPreviewBlock}>
        <View style={styles.photoPreviewHeader}>
          <Text style={styles.photoPreviewTitle}>{title}</Text>
          <Text style={styles.photoPreviewMeta}>
            {formatPhotoSize(photo.byte_size)}
          </Text>
        </View>
        <Text style={styles.photoPreviewSubtitle}>{subtitle}</Text>
        <Image
            source={{
              uri: getOrderPhotoFileUrl(orderId, photo.id),
              headers: imageAuthToken
                  ? {
                    "X-Musorok-Token": imageAuthToken,
                  }
                  : undefined,
            }}
            style={styles.orderPhoto}
        />
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

function normalizeOrderPhotos(values: any[]): OrderPhoto[] {
  return values
    .map((value) => {
      const id = typeof value?.id === "string" ? value.id : "";
      const orderId = typeof value?.order_id === "string" ? value.order_id : "";
      const kind =
          value?.kind === "client_before" || value?.kind === "courier_after"
              ? value.kind
              : null;

      if (!id || !orderId || !kind) {
        return null;
      }

      return {
        id,
        order_id: orderId,
        kind,
        content_type:
            typeof value?.content_type === "string"
                ? value.content_type
                : "image/jpeg",
        byte_size:
            typeof value?.byte_size === "number" && Number.isFinite(value.byte_size)
                ? value.byte_size
                : 0,
        uploaded_by:
            typeof value?.uploaded_by === "string" ? value.uploaded_by : "system",
        created_at:
            typeof value?.created_at === "string" ? value.created_at : null,
      };
    })
    .filter((photo): photo is OrderPhoto => Boolean(photo));
}

function formatPhotoSize(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Фото";
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
  }

  return `${Math.max(1, Math.round(value / 1024))} КБ`;
}

function getPaymentBlockingPresentation(
  paymentStatus: string | null | undefined
): PaymentBlockingPresentation {
  switch (paymentStatus) {
    case "pending":
      return {
        title: "Проверяем оплату",
        subtitle: "Банк подтверждает платёж. Как только оплата пройдёт, заказ пойдёт дальше.",
        statusBoxTitle: "Оплата в обработке",
        statusBoxText:
          "Если деньги уже списались, просто обнови статус через пару секунд. До подтверждения оплаты мы не запускаем выполнение заказа.",
        progressLabel: "Проверка оплаты",
        progressValue: 58,
        timelineLabel: "Проверка оплаты",
        timelineMeta: "Ждём ответ банка перед передачей заказа в работу",
        pillStatus: "assigned",
      };
    case "failed":
      return {
        title: "Оплата не прошла",
        subtitle: "Заказ сохранён, но выполнение начнётся только после успешной оплаты.",
        statusBoxTitle: "Нужно повторить оплату",
        statusBoxText:
          "Можно открыть оплату ещё раз. После успешного платежа заказ автоматически продолжит обычный маршрут.",
        progressLabel: "Оплата заказа",
        progressValue: 18,
        timelineLabel: "Повтор оплаты",
        timelineMeta: "Предыдущая попытка не прошла, заказ ждёт новый платёж",
        pillStatus: "cancelled",
      };
    case "cancelled":
      return {
        title: "Оплата отменена",
        subtitle: "Заказ сохранён, но ещё не передан в выполнение.",
        statusBoxTitle: "Можно оплатить заново",
        statusBoxText:
          "Открой оплату ещё раз, когда будешь готов. Курьерские этапы появятся после подтверждения платежа.",
        progressLabel: "Оплата заказа",
        progressValue: 12,
        timelineLabel: "Ожидаем оплату",
        timelineMeta: "Платёж был отменён, выполнение ещё не началось",
        pillStatus: "cancelled",
      };
    case "amount_mismatch":
      return {
        title: "Проверяем сумму",
        subtitle: "Банк вернул сумму, которая не совпала с заказом. Нужно ручное уточнение.",
        statusBoxTitle: "Оплата требует проверки",
        statusBoxText:
          "Пока сумма не совпадает с заказом, выполнение не запускается. Мы не дадим заказу уйти дальше с некорректной оплатой.",
        progressLabel: "Проверка оплаты",
        progressValue: 8,
        timelineLabel: "Проверка суммы",
        timelineMeta: "Заказ ждёт ручную проверку платежа",
        pillStatus: "cancelled",
      };
    case "refunded":
      return {
        title: "Оплата возвращена",
        subtitle: "По заказу выполнен возврат, поэтому выполнение остановлено до новой оплаты.",
        statusBoxTitle: "Платёж возвращён",
        statusBoxText:
          "Этот заказ нельзя продолжить как оплаченный. Для выполнения понадобится новый платёж или новый заказ.",
        progressLabel: "Оплата заказа",
        progressValue: 0,
        timelineLabel: "Возврат",
        timelineMeta: "Платёж возвращён, выполнение не начинается",
        pillStatus: "cancelled",
      };
    default:
      return {
        title: "Ожидаем оплату",
        subtitle: "Заказ создан, но выполнение начнётся только после оплаты.",
        statusBoxTitle: "Сначала оплата",
        statusBoxText:
          "Мы сохранили заказ и держим его на первом шаге. После успешной оплаты появятся этапы курьера и выполнения.",
        progressLabel: "Оплата заказа",
        progressValue: 10,
        timelineLabel: "Ожидаем оплату",
        timelineMeta: "Открой оплату, чтобы запустить выполнение заказа",
        pillStatus: "new",
      };
  }
}

function getPaymentActionTitle(
  paymentStatus: string | null | undefined,
  isOpeningPayment: boolean
) {
  if (isOpeningPayment) {
    return "Открываем оплату...";
  }

  if (paymentStatus === "pending") {
    return "Продолжить оплату";
  }

  if (paymentStatus === "failed" || paymentStatus === "cancelled") {
    return "Повторить оплату";
  }

  return "Оплатить заказ";
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
    heroAction: {
      marginTop: spacing.xs,
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
    timelineDotMuted: {
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      opacity: 0.7,
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
    timelineDotIndexMuted: {
      color: colors.textMuted,
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
    timelineLineMuted: {
      opacity: 0.7,
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
    timelineTitleMuted: {
      color: colors.textSecondary,
    },
    timelineMeta: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textMuted,
    },
    timelineMetaMuted: {
      opacity: 0.75,
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
    photoPreviewBlock: {
      gap: spacing.sm,
    },
    photoPreviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    photoPreviewTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    photoPreviewMeta: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.textMuted,
    },
    photoPreviewSubtitle: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textMuted,
    },
    orderPhoto: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceSecondary,
    },
    photoEmptyBox: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      gap: spacing.xs,
    },
    photoEmptyTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    photoEmptyText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textMuted,
    },
    photoWaitingBox: {
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      gap: spacing.xs,
    },
    photoWaitingTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    photoWaitingText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textMuted,
    },
    completionBox: {
      marginTop: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: spacing.md,
      gap: spacing.xs,
    },
    completionTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    completionText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    completionAction: {
      marginTop: spacing.sm,
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
