import { useCallback, useEffect, useMemo, useState } from "react";
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

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";
import { supabase } from "../../lib/supabase";

type ActiveOrder = {
  id: string;
  created_at: string | null;
  status: string | null;
  address: string | null;
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
  call_required: boolean | null;
};

const ACTIVE_ORDER_STORAGE_KEY = "active_order_id";

export default function ActiveOrderScreen() {
  const router = useRouter();

  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createdAt = useMemo(() => {
    if (!order?.created_at) {
      return null;
    }

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [order?.created_at]);

  const loadOrder = useCallback(async () => {
    try {
      setError(null);

      const storedOrderId = await AsyncStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);

      if (!storedOrderId) {
        setOrder(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, address, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, call_required"
        )
        .eq("id", storedOrderId)
        .single();

      if (fetchError || !data) {
        setOrder(null);
        return;
      }

      const normalizedStatus = (data.status || "").toLowerCase();

      if (normalizedStatus === "completed" || normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
        await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        setOrder(null);
        return;
      }

      setOrder(data);
    } catch (e) {
      setError("Не удалось загрузить активный заказ.");
    }
  }, []);

  const loadScreen = useCallback(async () => {
    setLoading(true);
    await loadOrder();
    setLoading(false);
  }, [loadOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  }, [loadOrder]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#E9281D" />
          <Text style={styles.loaderText}>Загружаем активный заказ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenSection
          title="Активный заказ"
          subtitle="Следите за текущим заказом и проверяйте его детали"
        >
          {error ? (
            <ErrorCard message={error} onRetry={loadScreen} />
          ) : !order ? (
            <AppCard>
              <Text style={styles.emptyTitle}>Активный заказ не найден</Text>
              <Text style={styles.emptyText}>
                Возможно, заказ уже завершён или ещё не был создан.
              </Text>

              <AppButton
                title="На главный экран"
                onPress={() => router.replace("/")}
                style={styles.buttonSpacing}
              />
            </AppCard>
          ) : (
            <>
              <AppCard>
                <View style={styles.rowBetween}>
                  <Text style={styles.orderTitle}>Заказ #{order.id.slice(0, 8)}</Text>
                  <StatusPill status={order.status} />
                </View>

                {createdAt ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.label}>Создан</Text>
                    <Text style={styles.value}>{createdAt}</Text>
                  </View>
                ) : null}

                <View style={styles.infoBlock}>
                  <Text style={styles.label}>Адрес</Text>
                  <Text style={styles.value}>{order.address || "Не указан"}</Text>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoGridItem}>
                    <Text style={styles.label}>Тариф</Text>
                    <Text style={styles.value}>{order.package_label || "—"}</Text>
                  </View>

                  <View style={styles.infoGridItem}>
                    <Text style={styles.label}>Итого</Text>
                    <Text style={styles.value}>
                      {typeof order.total === "number"
                        ? `${order.total} ₽`
                        : typeof order.package_price === "number"
                        ? `${order.package_price} ₽`
                        : "—"}
                    </Text>
                  </View>
                </View>
              </AppCard>

              <ScreenSection title="Детали заказа">
                <AppCard>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Квартира</Text>
                    <Text style={styles.detailValue}>{order.apartment || "—"}</Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Подъезд</Text>
                    <Text style={styles.detailValue}>{order.entrance || "—"}</Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Телефон</Text>
                    <Text style={styles.detailValue}>{order.phone || "—"}</Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Оплата</Text>
                    <Text style={styles.detailValue}>{order.payment_method || "—"}</Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Чаевые</Text>
                    <Text style={styles.detailValue}>
                      {typeof order.tip === "number" ? `${order.tip} ₽` : "0 ₽"}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Оставить у двери</Text>
                    <Text style={styles.detailValue}>{order.leave_at_door ? "Да" : "Нет"}</Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Нужно позвонить</Text>
                    <Text style={styles.detailValue}>
                      {order.should_call || order.call_required ? "Да" : "Нет"}
                    </Text>
                  </View>

                  <View style={styles.commentBlock}>
                    <Text style={styles.label}>Комментарий</Text>
                    <Text style={styles.commentValue}>{order.comment || "Нет комментария"}</Text>
                  </View>
                </AppCard>
              </ScreenSection>

              <AppButton
                title="На главный экран"
                variant="secondary"
                onPress={() => router.replace("/")}
              />
            </>
          )}
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
    paddingBottom: 28,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  orderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  infoBlock: {
    marginTop: 16,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  infoGridItem: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
  },
  buttonSpacing: {
    marginTop: 18,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  commentBlock: {
    marginTop: 16,
  },
  commentValue: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111827",
  },
});