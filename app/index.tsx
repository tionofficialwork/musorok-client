import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useFocusEffect, useRouter } from "expo-router";
import AppButton from "../components/ui/AppButton";
import AppCard from "../components/ui/AppCard";
import ErrorCard from "../components/ui/ErrorCard";
import ScreenSection from "../components/ui/ScreenSection";
import StatusPill from "../components/ui/StatusPill";
import {
  clearActiveOrder,
  getActiveOrder,
  isActiveOrderStatus,
  syncActiveOrder,
  type StoredActiveOrder,
} from "../lib/activeOrder";
import { getOwnerKey } from "../lib/profileOwner";
import {
  ACTIVE_ORDER_STATUSES,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "../lib/orderStatus";
import { supabase } from "../lib/supabase";
import { colors, radii, spacing, typography } from "../lib/theme";

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
  comment: string | null;
  leave_at_door: boolean | null;
  phone: string | null;
  should_call: boolean | null;
  payment_method: string | null;
  tip: number | null;
  total: number | null;
  courier_id: string | null;
  call_required: boolean | null;
  owner_key: string | null;
};

const DEBUG_HOME_REALTIME = true;

export default function HomeScreen() {
  const router = useRouter();
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const logDebug = useCallback((label: string, payload?: unknown) => {
    if (!DEBUG_HOME_REALTIME) {
      return;
    }

    if (payload !== undefined) {
      console.log(`[home-active-order] ${label}`, payload);
      return;
    }

    console.log(`[home-active-order] ${label}`);
  }, []);

  const applyStoredOrder = useCallback(async () => {
    const storedOrder = await getActiveOrder();

    logDebug("applyStoredOrder: loaded from storage", storedOrder);

    if (storedOrder) {
      const mapped = mapStoredOrderToOrderRow(storedOrder);
      setActiveOrder(mapped);
      logDebug("applyStoredOrder: mapped stored order", mapped);
      return true;
    }

    return false;
  }, [logDebug]);

  const loadHomeData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        logDebug("loadHomeData: start", { mode });

        if (mode === "initial") {
          setIsLoading(true);
          await applyStoredOrder();
        } else {
          setIsRefreshing(true);
        }

        setErrorText(null);

        const ownerKey = await getOwnerKey();

        logDebug("loadHomeData: resolved owner key", { ownerKey });

        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, created_at, status, address, package_id, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, courier_id, call_required, owner_key"
          )
          .eq("owner_key", ownerKey)
          .in("status", [...ACTIVE_ORDER_STATUSES])
          .order("created_at", { ascending: false })
          .limit(1);

        logDebug("loadHomeData: query result", { data, error });

        if (error) {
          throw error;
        }

        const nextOrder =
          Array.isArray(data) && data.length > 0 ? normalizeOrderRow(data[0]) : null;

        setActiveOrder(nextOrder);

        if (nextOrder) {
          await syncActiveOrder(nextOrder);
          logDebug("loadHomeData: synced active order", {
            id: nextOrder.id,
            status: nextOrder.status,
            owner_key: nextOrder.owner_key,
          });
        } else {
          await clearActiveOrder();
          logDebug("loadHomeData: cleared active order");
        }
      } catch (error: any) {
        const hasStored = await applyStoredOrder();

        const message =
          typeof error?.message === "string"
            ? error.message
            : "Не удалось загрузить данные главного экрана.";

        logDebug("loadHomeData: failed", {
          message,
          rawError: error,
          hasStored,
        });

        setErrorText(
          hasStored
            ? `Показан локально сохранённый активный заказ. ${message}`
            : message
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        logDebug("loadHomeData: finished", { mode });
      }
    },
    [applyStoredOrder, logDebug]
  );

  const handleRealtimeOrderUpdate = useCallback(
    async (nextOrder: OrderRow | null, source: string) => {
      logDebug("handleRealtimeOrderUpdate", {
        source,
        nextOrder,
      });

      if (!nextOrder || !isActiveOrderStatus(nextOrder.status ?? null)) {
        setActiveOrder(null);
        await clearActiveOrder();
        logDebug("handleRealtimeOrderUpdate: cleared order", {
          source,
          status: nextOrder?.status ?? null,
        });
        return;
      }

      setActiveOrder(nextOrder);
      await syncActiveOrder(nextOrder);
      logDebug("handleRealtimeOrderUpdate: synced order", {
        source,
        id: nextOrder.id,
        status: nextOrder.status,
        owner_key: nextOrder.owner_key,
      });
    },
    [logDebug]
  );

  useFocusEffect(
    useCallback(() => {
      logDebug("useFocusEffect: screen focused");
      loadHomeData("initial");

      return () => {
        logDebug("useFocusEffect cleanup: screen unfocused");

        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
          logDebug("useFocusEffect cleanup: channel removed");
        }
      };
    }, [loadHomeData, logDebug])
  );

  useEffect(() => {
    if (!activeOrder?.id) {
      logDebug("realtime effect: skipped because activeOrder.id is empty");

      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
        logDebug("realtime effect: removed previous channel because no active order");
      }

      return;
    }

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
      logDebug("realtime effect: removed previous channel before new subscribe");
    }

    const orderId = String(activeOrder.id);
    const channelName = `home-active-order:${orderId}`;

    logDebug("realtime effect: subscribing", {
      channelName,
      orderId,
      status: activeOrder.status,
      owner_key: activeOrder.owner_key,
    });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          logDebug("realtime UPDATE payload received", payload);

          const nextOrder = normalizeOrderRow(payload.new);
          await handleRealtimeOrderUpdate(nextOrder, "realtime:update");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          logDebug("realtime DELETE payload received", payload);
          await handleRealtimeOrderUpdate(null, "realtime:delete");
        }
      )
      .subscribe((status, err) => {
        logDebug("realtime subscribe status", { status, err, orderId });

        if (status === "CHANNEL_ERROR") {
          setErrorText(
            "Realtime-подключение временно недоступно. Можно обновить экран вручную."
          );
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      logDebug("realtime effect cleanup", { channelName, orderId });

      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
        logDebug("realtime effect cleanup: channel removed");
      }
    };
  }, [activeOrder?.id, handleRealtimeOrderUpdate, logDebug]);

  const handleRefresh = () => {
    logDebug("manual refresh triggered");
    loadHomeData("refresh");
  };

  const handleCreateOrder = () => {
    router.push("/order/package");
  };

  const handleOpenActive = () => {
    router.push("/order/active");
  };

  const handleOpenHistory = () => {
    router.push("/order/history");
  };

  const handleOpenProfile = () => {
    router.push("/profile");
  };

  const activeOrderStatusLabel = useMemo(
    () => getOrderStatusLabel(activeOrder?.status ?? null),
    [activeOrder?.status]
  );

  const activeOrderStatusTone = useMemo(
    () => getOrderStatusTone(activeOrder?.status ?? null),
    [activeOrder?.status]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerTitle}>Загружаем МусорОК</Text>
            <Text style={styles.centerText}>
              Проверяем локальные данные и обновляем активный заказ из Supabase.
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
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>МусорОК</Text>
              <Text style={styles.title}>Вынос мусора по кнопке</Text>
              <Text style={styles.subtitle}>
                Быстро создавай заказ, следи за активной заявкой и возвращайся к
                прошлым заказам в пару нажатий.
              </Text>
            </View>

            <ScreenSection
              title="Быстрые действия"
              subtitle="Главные сценарии клиента в одном месте"
            >
              <AppCard>
                <AppButton title="Создать заказ" onPress={handleCreateOrder} />
                <View style={styles.actionSpacer} />
                <AppButton title="Активный заказ" onPress={handleOpenActive} />
                <View style={styles.actionSpacer} />
                <AppButton title="История заказов" onPress={handleOpenHistory} />
                <View style={styles.actionSpacer} />
                <AppButton title="Профиль" onPress={handleOpenProfile} />
              </AppCard>
            </ScreenSection>

            {errorText ? (
              <ErrorCard
                title="Проблема с загрузкой"
                description={errorText}
                actionLabel="Повторить"
                onAction={handleRefresh}
              />
            ) : null}

            {activeOrder ? (
              <ScreenSection title="Активный заказ" subtitle="То, что сейчас в работе">
                <AppCard>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderText}>
                      <Text style={styles.orderId}>Заказ #{activeOrder.id}</Text>
                      <Text style={styles.orderMeta}>
                        {activeOrder.package_label || "Без названия"} ·{" "}
                        {formatCreatedAt(activeOrder.created_at)}
                      </Text>
                    </View>

                    <StatusPill
                      label={activeOrderStatusLabel}
                      tone={activeOrderStatusTone}
                    />
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxTitle}>Адрес</Text>
                    <Text style={styles.infoBoxText}>
                      {activeOrder.address || "Адрес не указан"}
                    </Text>
                  </View>

                  <View style={styles.summaryList}>
                    <InfoRow
                      label="Стоимость пакета"
                      value={`${Number(activeOrder.package_price ?? 0)} ₽`}
                    />
                    <Divider />
                    <InfoRow
                      label="Чаевые"
                      value={`${Number(activeOrder.tip ?? 0)} ₽`}
                    />
                    <Divider />
                    <InfoRow
                      label="Итого"
                      value={`${Number(activeOrder.total ?? 0)} ₽`}
                      strong
                    />
                  </View>

                  <View style={styles.cardFooter}>
                    <AppButton
                      title="Открыть активный заказ"
                      onPress={handleOpenActive}
                    />
                  </View>
                </AppCard>
              </ScreenSection>
            ) : (
              <ScreenSection
                title="Сейчас активного заказа нет"
                subtitle="Можно создать новый заказ прямо сейчас"
              >
                <AppCard>
                  <View style={styles.emptyIconWrap}>
                    <Text style={styles.emptyIcon}>🗑️</Text>
                  </View>

                  <Text style={styles.emptyTitle}>Готовы забрать мусор</Text>
                  <Text style={styles.emptyText}>
                    Создай заказ, укажи адрес и детали — дальше заявка появится на
                    экране активного заказа.
                  </Text>

                  <View style={styles.cardFooter}>
                    <AppButton
                      title="Создать новый заказ"
                      onPress={handleCreateOrder}
                    />
                  </View>
                </AppCard>
              </ScreenSection>
            )}

            <ScreenSection
              title="Как это работает"
              subtitle="Коротко про основной пользовательский путь"
            >
              <AppCard>
                <StepRow
                  index="1"
                  title="Выбираешь пакет"
                  text="Подбираешь подходящий объём мусора под текущую ситуацию."
                />
                <StepDivider />
                <StepRow
                  index="2"
                  title="Заполняешь детали"
                  text="Указываешь адрес, телефон, комментарий и нужные настройки."
                />
                <StepDivider />
                <StepRow
                  index="3"
                  title="Подтверждаешь заказ"
                  text="После подтверждения заказ создаётся в Supabase и становится активным."
                />
              </AppCard>
            </ScreenSection>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

function InfoRow({ label, value, strong = false }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, strong ? styles.infoLabelStrong : undefined]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, strong ? styles.infoValueStrong : undefined]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

type StepRowProps = {
  index: string;
  title: string;
  text: string;
};

function StepRow({ index, title, text }: StepRowProps) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{index}</Text>
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function StepDivider() {
  return <View style={styles.stepDivider} />;
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
    comment: order.comment ?? null,
    leave_at_door: order.leave_at_door ?? null,
    phone: order.phone ?? null,
    should_call: order.should_call ?? null,
    payment_method: order.payment_method ?? null,
    tip: order.tip ?? null,
    total: order.total ?? null,
    courier_id: order.courier_id ?? null,
    call_required: order.call_required ?? null,
    owner_key: order.owner_key ?? null,
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
    comment: value.comment ?? null,
    leave_at_door: value.leave_at_door ?? null,
    phone: value.phone ?? null,
    should_call: value.should_call ?? null,
    payment_method: value.payment_method ?? null,
    tip: value.tip ?? null,
    total: value.total ?? null,
    courier_id: value.courier_id ?? null,
    call_required: value.call_required ?? null,
    owner_key: value.owner_key ?? null,
  };
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return "время неизвестно";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "время неизвестно";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
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
  actionSpacer: {
    height: spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  orderHeaderText: {
    flex: 1,
    gap: 4,
  },
  orderId: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  orderMeta: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  infoBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBoxTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  summaryList: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  infoLabelStrong: {
    fontWeight: "700",
    color: colors.text,
  },
  infoValue: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  infoValueStrong: {
    fontSize: typography.h3,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardFooter: {
    marginTop: spacing.sm,
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
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  stepBadgeText: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  stepText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});