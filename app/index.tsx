import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { getActiveOrder } from "../lib/activeOrder";
import { supabase } from "../lib/supabase";

type ActiveOrderPreview = {
  id: string;
  status: string | null;
  address: string | null;
  total: number | null;
};

function getStatusLabel(status: string | null | undefined) {
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
      return "Активный заказ";
  }
}

function getStatusChipStyles(status: string | null | undefined) {
  switch (status) {
    case "assigned":
    case "on_the_way":
    case "arrived":
      return {
        backgroundColor: "#10233D",
        textColor: "#60A5FA",
      };
    case "done":
      return {
        backgroundColor: "#0F2A1A",
        textColor: "#4ADE80",
      };
    case "cancelled":
      return {
        backgroundColor: "#2A1215",
        textColor: "#F87171",
      };
    case "new":
    default:
      return {
        backgroundColor: "#1F2937",
        textColor: "#D1D5DB",
      };
  }
}

function formatPrice(value: number | null) {
  if (typeof value !== "number") return "—";
  return `${value} ₽`;
}

export default function HomeScreen() {
  const router = useRouter();

  const [checkingOrder, setCheckingOrder] = useState(true);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderPreview | null>(null);

  const loadActiveOrderState = useCallback(async () => {
    try {
      const storedActiveOrderId = await getActiveOrder();

      if (!storedActiveOrderId) {
        setActiveOrder(null);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id, status, address, total")
        .eq("id", storedActiveOrderId)
        .single();

      if (error) {
        setActiveOrder(null);
        return;
      }

      const nextOrder = data as ActiveOrderPreview;

      if (nextOrder.status === "done" || nextOrder.status === "cancelled") {
        setActiveOrder(null);
        return;
      }

      setActiveOrder(nextOrder);
    } finally {
      setCheckingOrder(false);
    }
  }, []);

  useEffect(() => {
    loadActiveOrderState();
  }, [loadActiveOrderState]);

  useFocusEffect(
    useCallback(() => {
      loadActiveOrderState();
    }, [loadActiveOrderState])
  );

  if (checkingOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Проверяем активный заказ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasActiveOrder = Boolean(activeOrder);
  const statusChip = getStatusChipStyles(activeOrder?.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>МУСОРОК</Text>
        <Text style={styles.title}>Вынос мусора по кнопке</Text>
        <Text style={styles.subtitle}>
          Оформите заказ за пару шагов, а дальше мы возьмём всё на себя.
        </Text>

        {hasActiveOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.activeOrderTop}>
              <Text style={styles.activeOrderBadge}>АКТИВНЫЙ ЗАКАЗ</Text>

              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: statusChip.backgroundColor },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: statusChip.textColor },
                  ]}
                >
                  {getStatusLabel(activeOrder?.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.activeOrderTitle}>У вас есть активный заказ</Text>

            <Text style={styles.activeOrderText}>
              Заказ #{activeOrder?.id || "—"} сейчас в работе.
            </Text>

            <View style={styles.activeOrderInfoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Адрес</Text>
                <Text style={styles.infoValue}>{activeOrder?.address || "—"}</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Сумма</Text>
                <Text style={styles.infoValue}>{formatPrice(activeOrder?.total ?? null)}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push("/order/active")}
              >
                <Text style={styles.primaryButtonText}>Открыть заказ</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/order/history")}
              >
                <Text style={styles.secondaryButtonText}>История заказов</Text>
              </Pressable>

              <Pressable
                style={styles.ghostButton}
                onPress={() => router.push("/order/package")}
              >
                <Text style={styles.ghostButtonText}>Новый заказ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/order/package")}
            >
              <Text style={styles.primaryButtonText}>Начать заказ</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/order/history")}
            >
              <Text style={styles.secondaryButtonText}>История заказов</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#031225",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  brand: {
    color: "#94A3B8",
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 32,
  },
  activeOrderCard: {
    backgroundColor: "#081426",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  activeOrderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  activeOrderBadge: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  activeOrderTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  activeOrderText: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  activeOrderInfoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "#0B1A2E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#13243A",
  },
  infoLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 6,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#22C55E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#04110A",
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: "700",
  },
  ghostButton: {
    backgroundColor: "#0B1A2E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#13243A",
  },
  ghostButtonText: {
    color: "#CBD5E1",
    fontSize: 17,
    fontWeight: "700",
  },
});