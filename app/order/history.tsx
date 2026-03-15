import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";

import { supabase } from "../../lib/supabase";

type OrderStatus = "new" | "assigned" | "on_the_way" | "arrived" | "done" | "cancelled" | string;

type OrderHistoryRow = {
  id: string;
  status: OrderStatus;
  address: string | null;
  phone: string | null;
  entrance: string | null;
  comment: string | null;
  leave_at_door: boolean | null;
  call_required: boolean | null;
  package_id: string | null;
  package_label: string | null;
  package_price: number | null;
  total: number | null;
  created_at: string | null;
};

function formatPrice(value: number | null) {
  if (typeof value !== "number") return "—";
  return `${value} ₽`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "new":
      return "Заказ создан";
    case "assigned":
      return "Курьер назначен";
    case "on_the_way":
      return "Курьер в пути";
    case "arrived":
      return "Курьер прибыл";
    case "done":
      return "Выполнен";
    case "cancelled":
      return "Отменён";
    default:
      return String(status);
  }
}

function getStatusStyles(status: OrderStatus) {
  switch (status) {
    case "done":
      return {
        badgeBg: "#0F2A1A",
        badgeText: "#4ADE80",
      };
    case "cancelled":
      return {
        badgeBg: "#2A1215",
        badgeText: "#F87171",
      };
    case "assigned":
    case "on_the_way":
    case "arrived":
      return {
        badgeBg: "#10233D",
        badgeText: "#60A5FA",
      };
    case "new":
    default:
      return {
        badgeBg: "#1F2937",
        badgeText: "#D1D5DB",
      };
  }
}

export default function OrderHistoryScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setScreenError(null);

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, address, phone, entrance, comment, leave_at_door, call_required, package_id, package_label, package_price, total, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setOrders((data as OrderHistoryRow[]) || []);
    } catch (e: any) {
      console.error("Failed to fetch order history:", e);
      setScreenError(e?.message || "Не удалось загрузить историю заказов.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const completedCount = useMemo(
    () => orders.filter((order) => order.status === "done").length,
    [orders]
  );

  const activeCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "new" ||
          order.status === "assigned" ||
          order.status === "on_the_way" ||
          order.status === "arrived"
      ).length,
    [orders]
  );

  const handleOpenOrder = (orderId: string) => {
    router.push({
      pathname: "/order/success",
      params: { orderId },
    });
  };

  const handleReorder = async (order: OrderHistoryRow) => {
    if (!order.package_id || !order.package_label || typeof order.package_price !== "number") {
      setScreenError("У этого заказа не хватает данных для повторного оформления.");
      return;
    }

    if (!order.address || !order.phone) {
      setScreenError("У этого заказа не хватает адреса или телефона для повторного оформления.");
      return;
    }

    try {
      setReorderingId(order.id);
      setScreenError(null);

      router.push({
        pathname: "/order/confirm",
        params: {
          packageId: order.package_id,
          packageName: order.package_label,
          price: String(order.package_price),
          address: order.address,
          phone: order.phone,
          entrance: order.entrance || "",
          comment: order.comment || "",
          leaveAtDoor: order.leave_at_door ? "true" : "false",
          callRequired: order.call_required ? "true" : "false",
        },
      });
    } finally {
      setReorderingId(null);
    }
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleRefresh = async () => {
    await fetchOrders(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "История заказов" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.title}>История заказов</Text>
        <Text style={styles.subtitle}>
          Здесь отображаются все оформленные заказы и их текущие статусы.
        </Text>

        <View style={styles.statsHeader}>
          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{orders.length}</Text>
              <Text style={styles.statsLabel}>Всего</Text>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{activeCount}</Text>
              <Text style={styles.statsLabel}>Активных</Text>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{completedCount}</Text>
              <Text style={styles.statsLabel}>Завершено</Text>
            </View>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#04110A" />
            ) : (
              <Text style={styles.refreshButtonText}>Обновить историю</Text>
            )}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateText}>Загружаем историю заказов...</Text>
          </View>
        ) : screenError ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Не удалось загрузить историю</Text>
            <Text style={styles.stateText}>{screenError}</Text>

            <Pressable style={styles.primaryButton} onPress={handleRefresh}>
              <Text style={styles.primaryButtonText}>Повторить</Text>
            </Pressable>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Заказов пока нет</Text>
            <Text style={styles.stateText}>
              Как только вы оформите первый заказ, он появится здесь.
            </Text>

            <Pressable style={styles.primaryButton} onPress={handleGoHome}>
              <Text style={styles.primaryButtonText}>На главную</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order) => {
              const statusStyles = getStatusStyles(order.status);
              const isReordering = reorderingId === order.id;

              return (
                <View key={order.id} style={styles.orderCard}>
                  <Pressable onPress={() => handleOpenOrder(order.id)}>
                    <View style={styles.orderTopRow}>
                      <View style={styles.orderMainInfo}>
                        <Text style={styles.orderTitle}>Заказ #{order.id}</Text>
                        <Text style={styles.orderAddress}>{order.address || "—"}</Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: statusStyles.badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyles.badgeText }]}>
                          {getStatusLabel(order.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderMetaRow}>
                      <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Пакет</Text>
                        <Text style={styles.metaValue}>{order.package_label || "—"}</Text>
                      </View>

                      <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Сумма</Text>
                        <Text style={styles.metaValue}>{formatPrice(order.total)}</Text>
                      </View>
                    </View>

                    <View style={styles.orderFooter}>
                      <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                      <Text style={styles.orderLink}>Открыть</Text>
                    </View>
                  </Pressable>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.reorderButton}
                      onPress={() => handleReorder(order)}
                      disabled={isReordering}
                    >
                      {isReordering ? (
                        <ActivityIndicator color="#04110A" />
                      ) : (
                        <Text style={styles.reorderButtonText}>Повторить заказ</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && orders.length > 0 ? (
          <Pressable style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>На главную</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#031225",
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
  },
  statsHeader: {
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#081426",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  statsValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statsLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },
  refreshButton: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#04110A",
    fontSize: 15,
    fontWeight: "800",
  },
  stateCard: {
    backgroundColor: "#081426",
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#0F2138",
    alignItems: "center",
  },
  stateTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  list: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: "#081426",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#0F2138",
    gap: 14,
  },
  orderTopRow: {
    gap: 10,
  },
  orderMainInfo: {
    gap: 6,
  },
  orderTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  orderAddress: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 21,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  orderMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  metaBlock: {
    flex: 1,
    backgroundColor: "#0B1A2E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#13243A",
  },
  metaLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 6,
  },
  metaValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  orderDate: {
    color: "#94A3B8",
    fontSize: 13,
  },
  orderLink: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "700",
  },
  cardActions: {
    marginTop: 2,
  },
  reorderButton: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  reorderButtonText: {
    color: "#04110A",
    fontSize: 16,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    minWidth: 180,
  },
  primaryButtonText: {
    color: "#04110A",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#081426",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});