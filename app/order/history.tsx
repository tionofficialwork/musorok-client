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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";

type OrderRow = {
  id: string;
  created_at: string;
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

const ACTIVE_ORDER_STORAGE_KEY = "activeOrder";

function formatPrice(value?: number | null) {
  if (typeof value !== "number") return "—";
  return `${value} ₽`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildOrderDetailsPath(order: OrderRow) {
  const params = new URLSearchParams();

  if (order.package_id) params.set("packageId", order.package_id);
  if (order.package_label) params.set("packageName", order.package_label);
  if (typeof order.package_price === "number") {
    params.set("price", String(order.package_price));
  }

  return `/order/details?${params.toString()}`;
}

export default function HistoryScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setErrorMessage("");

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, address, package_id, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, courier_id, call_required"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(data ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить историю заказов";
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  const handleReorder = useCallback(
    async (order: OrderRow) => {
      if (["completed", "cancelled", "canceled"].includes(order.status || "")) {
        await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      }

      router.push(buildOrderDetailsPath(order));
    },
    [router]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Загружаем историю заказов…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ScreenSection
          title="История заказов"
          subtitle="Все ранее созданные заказы в одном месте"
        >
          {errorMessage ? (
            <ErrorCard message={errorMessage} onRetry={loadHistory} />
          ) : null}

          {!errorMessage && orders.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>История пока пустая</Text>
              <Text style={styles.emptyText}>
                Как только ты создашь первый заказ, он появится здесь.
              </Text>

              <AppButton
                title="Создать заказ"
                onPress={() => router.push("/order/package")}
                style={styles.cardButton}
              />
            </AppCard>
          ) : null}

          <View style={styles.list}>
            {orders.map((order) => (
              <AppCard key={order.id}>
                <View style={styles.headerRow}>
                  <View style={styles.headerInfo}>
                    <Text style={styles.cardTitle}>
                      {order.package_label || "Заказ"}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatDate(order.created_at)}
                    </Text>
                  </View>

                  <StatusPill status={order.status} />
                </View>

                <View style={styles.block}>
                  <Text style={styles.label}>Адрес</Text>
                  <Text style={styles.value}>{order.address || "—"}</Text>
                </View>

                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <Text style={styles.label}>Оплата</Text>
                    <Text style={styles.value}>{order.payment_method || "—"}</Text>
                  </View>

                  <View style={styles.column}>
                    <Text style={styles.label}>Стоимость</Text>
                    <Text style={styles.value}>{formatPrice(order.total)}</Text>
                  </View>
                </View>

                <AppButton
                  title="Повторить заказ"
                  variant="secondary"
                  onPress={() => handleReorder(order)}
                  style={styles.cardButton}
                />
              </AppCard>
            ))}
          </View>
        </ScreenSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  list: {
    gap: 12,
    marginTop: 12,
  },
  emptyCard: {
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  block: {
    marginTop: 16,
  },
  twoColumns: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111827",
  },
  cardButton: {
    marginTop: 18,
  },
});