import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";
import {
  clearActiveOrder,
  getActiveOrder,
  isActiveOrderStatus,
  syncActiveOrder,
  type StoredActiveOrder,
} from "../../lib/activeOrder";
import {
  ACTIVE_ORDER_STATUSES,
  getActiveOrderStatusDescription,
  getActiveOrderStatusMeta,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "../../lib/orderStatus";
import { supabase } from "../../lib/supabase";
import { colors, radii, spacing, typography } from "../../lib/theme";

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
};

export default function ActiveOrderScreen() {
  const router = useRouter();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const applyStoredOrder = useCallback(async () => {
    const storedOrder = await getActiveOrder();

    if (storedOrder) {
      setOrder(mapStoredOrderToOrderRow(storedOrder));
      return true;
    }

    return false;
  }, []);

  const loadActiveOrder = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
          await applyStoredOrder();
        } else {
          setIsRefreshing(true);
        }

        setErrorText(null);

        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, created_at, status, address, package_id, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, courier_id, call_required"
          )
          .in("status", [...ACTIVE_ORDER_STATUSES])
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        const nextOrder =
          Array.isArray(data) && data.length > 0 ? (data[0] as OrderRow) : null;

        setOrder(nextOrder);

        if (nextOrder) {
          await syncActiveOrder(nextOrder);
        } else {
          await clearActiveOrder();
        }
      } catch (error: any) {
        const hasStored = await applyStoredOrder();

        const message =
          typeof error?.message === "string"
            ? error.message
            : "Не удалось загрузить активный заказ.";

        setErrorText(
          hasStored
            ? `Показан локально сохранённый заказ. ${message}`
            : message
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
    }, [loadActiveOrder])
  );

  const handleRefresh = () => {
    loadActiveOrder("refresh");
  };

  const handleCreateOrder = () => {
    router.push("/order/package");
  };

  const handleOpenHistory = () => {
    router.push("/order/history");
  };

  const statusLabel = getOrderStatusLabel(order?.status ?? null);
  const statusTone = getOrderStatusTone(order?.status ?? null);
  const orderMeta = getActiveOrderStatusMeta(order?.status ?? null);

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
                Проверяем локальные данные и обновляем заказ из Supabase.
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
                <Text style={styles.eyebrow}>После создания заказа</Text>
                <Text style={styles.title}>Текущий заказ</Text>
                <Text style={styles.subtitle}>
                  Здесь отображается актуальный заказ, который ещё не завершён и не отменён.
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

              {!order ? (
                <ScreenSection
                  title="Сейчас активного заказа нет"
                  subtitle="Можно быстро создать новый заказ или перейти в историю"
                >
                  <AppCard>
                    <View style={styles.emptyIconWrap}>
                      <Text style={styles.emptyIcon}>🗑️</Text>
                    </View>

                    <Text style={styles.emptyTitle}>Нет заказа в работе</Text>
                    <Text style={styles.emptyText}>
                      Когда создашь новый заказ, он появится здесь со статусом и основной информацией.
                    </Text>

                    <View style={styles.emptyActions}>
                      <AppButton title="Создать заказ" onPress={handleCreateOrder} />
                      <View style={styles.actionSpacer} />
                      <AppButton title="Открыть историю" onPress={handleOpenHistory} />
                    </View>
                  </AppCard>
                </ScreenSection>
              ) : (
                <>
                  <ScreenSection
                    title="Статус заказа"
                    subtitle="Основная информация по текущему заказу"
                  >
                    <AppCard>
                      <View style={styles.statusHeader}>
                        <View style={styles.statusHeaderText}>
                          <Text style={styles.orderId}>Заказ #{order.id}</Text>
                          <Text style={styles.statusSubtitle}>{orderMeta}</Text>
                        </View>

                        <StatusPill label={statusLabel} tone={statusTone} />
                      </View>

                      <View style={styles.statusBox}>
                        <Text style={styles.statusBoxTitle}>Что происходит сейчас</Text>
                        <Text style={styles.statusBoxText}>
                          {getActiveOrderStatusDescription(order.status)}
                        </Text>
                      </View>
                    </AppCard>
                  </ScreenSection>

                  <ScreenSection
                    title="Детали заказа"
                    subtitle="Содержимое и адрес"
                  >
                    <AppCard>
                      <InfoRow
                        label="Пакет"
                        value={order.package_label || "Не указан"}
                      />
                      <Divider />
                      <InfoRow
                        label="Адрес"
                        value={order.address || "Не указан"}
                        rightAligned
                      />

                      {order.apartment || order.entrance ? (
                        <>
                          <Divider />
                          <InfoRow
                            label="Детали адреса"
                            value={[
                              order.apartment ? `кв. ${order.apartment}` : "",
                              order.entrance ? `подъезд ${order.entrance}` : "",
                            ]
                              .filter(Boolean)
                              .join(", ")}
                            rightAligned
                          />
                        </>
                      ) : null}

                      <Divider />
                      <InfoRow
                        label="Телефон"
                        value={order.phone || "Не указан"}
                      />

                      {order.comment ? (
                        <>
                          <Divider />
                          <View style={styles.noteBox}>
                            <Text style={styles.noteTitle}>Комментарий для курьера</Text>
                            <Text style={styles.noteText}>{order.comment}</Text>
                          </View>
                        </>
                      ) : null}
                    </AppCard>
                  </ScreenSection>

                  <ScreenSection
                    title="Параметры выполнения"
                    subtitle="Как оформлен заказ"
                  >
                    <AppCard>
                      <InfoRow
                        label="Оставить у двери"
                        value={order.leave_at_door ? "Да" : "Нет"}
                      />
                      <Divider />
                      <InfoRow
                        label="Позвонить заранее"
                        value={order.should_call || order.call_required ? "Да" : "Нет"}
                      />
                      <Divider />
                      <InfoRow
                        label="Способ оплаты"
                        value={formatPaymentMethod(order.payment_method)}
                      />
                    </AppCard>
                  </ScreenSection>

                  <ScreenSection
                    title="Сумма"
                    subtitle="Финальные значения заказа"
                  >
                    <AppCard>
                      <InfoRow
                        label="Стоимость пакета"
                        value={`${Number(order.package_price ?? 0)} ₽`}
                      />
                      <Divider />
                      <InfoRow
                        label="Чаевые"
                        value={`${Number(order.tip ?? 0)} ₽`}
                      />

                      <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Итого</Text>
                        <Text style={styles.totalValue}>
                          {Number(order.total ?? 0)} ₽
                        </Text>
                      </View>
                    </AppCard>
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

type InfoRowProps = {
  label: string;
  value: string;
  rightAligned?: boolean;
};

function InfoRow({ label, value, rightAligned = false }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, rightAligned ? styles.infoValueRight : undefined]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  };
}

function formatPaymentMethod(paymentMethod: string | null) {
  if (paymentMethod === "cash") {
    return "Наличными";
  }

  if (paymentMethod === "card") {
    return "Картой";
  }

  return "Не указан";
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
  statusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeaderText: {
    flex: 1,
    gap: 4,
  },
  orderId: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
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
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  infoValueRight: {
    flex: 1,
    textAlign: "right",
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
});