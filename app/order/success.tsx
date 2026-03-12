import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { clearActiveOrder, saveActiveOrder } from "../../lib/activeOrder";
import { supabase } from "../../lib/supabase";

type OrderStatus = "new" | "assigned" | "on_the_way" | "arrived" | "done" | "cancelled";

type OrderRow = {
  id: string;
  status: OrderStatus;
  address: string | null;
  package_id: string | null;
  package_label: string | null;
  package_price: number | null;
  total: number | null;
  phone: string | null;
  payment_method: string | null;
  created_at: string | null;
};

const STATUS_STEPS: OrderStatus[] = ["new", "assigned", "on_the_way", "arrived", "done"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Заказ создан",
  assigned: "Курьер назначен",
  on_the_way: "Курьер в пути",
  arrived: "Курьер прибыл",
  done: "Заказ выполнен",
  cancelled: "Заказ отменён",
};

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  new: "Мы получили ваш заказ и скоро начнем его обрабатывать.",
  assigned: "Заказ взят в работу. Скоро курьер начнет движение.",
  on_the_way: "Курьер уже направляется к вам.",
  arrived: "Курьер на месте. Можно передавать мусор.",
  done: "Спасибо! Заказ успешно завершен.",
  cancelled: "Этот заказ был отменен.",
};

function formatPrice(value: number | null) {
  if (typeof value !== "number") return "—";
  return `${value} ₽`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU");
}

function formatPaymentMethod(value: string | null) {
  if (!value) return "—";

  if (value === "card") return "Картой";
  if (value === "cash") return "Наличными";
  if (value === "sbp") return "СБП";

  return value;
}

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const index = STATUS_STEPS.indexOf(order.status);
    return index === -1 ? 0 : index;
  }, [order]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setScreenError("Не найден ID заказа. Попробуйте оформить заказ заново.");
      return;
    }

    saveActiveOrder(orderId);

    let isMounted = true;

    const loadOrder = async () => {
      setLoading(true);
      setScreenError(null);

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, address, package_id, package_label, package_price, total, phone, payment_method, created_at"
        )
        .eq("id", orderId)
        .single();

      if (!isMounted) return;

      if (error) {
        setScreenError(error.message || "Не удалось загрузить заказ.");
        setLoading(false);
        return;
      }

      setOrder(data as OrderRow);
      setLoading(false);
    };

    loadOrder();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          const next = payload.new as OrderRow;
          setOrder(next);

          if (next.status === "done" || next.status === "cancelled") {
            await clearActiveOrder();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleGoHome = async () => {
    if (order?.status === "done" || order?.status === "cancelled") {
      await clearActiveOrder();
    }

    router.replace("/");
  };

  const title = order ? STATUS_LABELS[order.status] : "Заказ создан";
  const description = order ? STATUS_DESCRIPTIONS[order.status] : "Мы получили ваш заказ.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Активный заказ", headerBackVisible: false }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>МУСОРОК</Text>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroDescription}>{description}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Загружаем заказ...</Text>
          </View>
        ) : screenError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Не удалось открыть заказ</Text>
            <Text style={styles.errorText}>{screenError}</Text>

            <Pressable style={styles.primaryButton} onPress={handleGoHome}>
              <Text style={styles.primaryButtonText}>На главную</Text>
            </Pressable>
          </View>
        ) : order ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Прогресс заказа</Text>

              <View style={styles.timeline}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = order.status === step;

                  return (
                    <View key={step} style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          isCompleted && styles.timelineDotCompleted,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      />
                      <View style={styles.timelineContent}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            isCompleted && styles.timelineLabelCompleted,
                          ]}
                        >
                          {STATUS_LABELS[step]}
                        </Text>
                        {isCurrent ? (
                          <Text style={styles.timelineCurrent}>Текущий статус</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Детали заказа</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Номер заказа</Text>
                <Text style={styles.infoValue}>{order.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Адрес</Text>
                <Text style={styles.infoValue}>{order.address || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Пакет</Text>
                <Text style={styles.infoValue}>{order.package_label || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Цена</Text>
                <Text style={styles.infoValue}>{formatPrice(order.package_price)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Итого</Text>
                <Text style={styles.infoValue}>{formatPrice(order.total)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Телефон</Text>
                <Text style={styles.infoValue}>{order.phone || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Оплата</Text>
                <Text style={styles.infoValue}>{formatPaymentMethod(order.payment_method)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Создан</Text>
                <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
              </View>
            </View>

            {order.status === "done" || order.status === "cancelled" ? (
              <Pressable style={styles.primaryButton} onPress={handleGoHome}>
                <Text style={styles.primaryButtonText}>Готово</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.secondaryButton} onPress={handleGoHome}>
                <Text style={styles.secondaryButtonText}>Вернуться на главную</Text>
              </Pressable>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  heroBadge: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroDescription: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 22,
  },
  loadingCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  loadingText: {
    color: "#E5E7EB",
    fontSize: 15,
  },
  errorCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  errorText: {
    color: "#D1D5DB",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  timeline: {
    gap: 14,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#374151",
    marginTop: 4,
    marginRight: 12,
  },
  timelineDotCompleted: {
    backgroundColor: "#22C55E",
  },
  timelineDotCurrent: {
    transform: [{ scale: 1.15 }],
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  timelineLabelCompleted: {
    color: "#FFFFFF",
  },
  timelineCurrent: {
    color: "#22C55E",
    fontSize: 13,
    marginTop: 4,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    gap: 6,
  },
  infoLabel: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#08110A",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});