import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

type ActiveOrderStatus =
  | "new"
  | "searching"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | string;

type ActiveOrder = {
  id: string;
  status?: ActiveOrderStatus | null;
  address?: string | null;
  total_price?: number | null;
  package_name?: string | null;
  entrance?: string | null;
  comment?: string | null;
  leave_at_door?: boolean | null;
  call_required?: boolean | null;
};

const ACTIVE_ORDER_STORAGE_KEYS = [
  "activeOrder",
  "active_order",
  "musorok_active_order",
];

const COMPLETED_STATUSES = new Set(["completed", "cancelled"]);

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value} ₽`;
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case "new":
      return "Новый";
    case "searching":
      return "Ищем курьера";
    case "assigned":
      return "Курьер назначен";
    case "on_the_way":
      return "Курьер в пути";
    case "arrived":
      return "Курьер на месте";
    case "in_progress":
      return "Заказ выполняется";
    case "completed":
      return "Выполнен";
    case "cancelled":
      return "Отменён";
    default:
      return "В обработке";
  }
}

export default function HomeScreen() {
  const router = useRouter();

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const activeStatusLabel = useMemo(
    () => getStatusLabel(activeOrder?.status),
    [activeOrder?.status]
  );

  const readStoredActiveOrder = useCallback(async (): Promise<ActiveOrder | null> => {
    for (const key of ACTIVE_ORDER_STORAGE_KEYS) {
      const rawValue = await AsyncStorage.getItem(key);

      if (!rawValue) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawValue) as ActiveOrder | null;

        if (parsed?.id) {
          return parsed;
        }
      } catch {
        // ignore broken value and continue
      }
    }

    return null;
  }, []);

  const removeStoredActiveOrder = useCallback(async () => {
    await Promise.all(
      ACTIVE_ORDER_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key))
    );
  }, []);

  const syncActiveOrder = useCallback(async () => {
    setErrorText(null);

    const stored = await readStoredActiveOrder();

    if (!stored?.id) {
      setActiveOrder(null);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, address, total_price, package_name, entrance, comment, leave_at_door, call_required"
      )
      .eq("id", stored.id)
      .single();

    if (error) {
      setActiveOrder(stored);
      setErrorText("Не удалось обновить активный заказ. Показаны сохранённые данные.");
      return;
    }

    if (!data) {
      setActiveOrder(stored);
      setErrorText("Заказ не найден. Показаны сохранённые данные.");
      return;
    }

    if (COMPLETED_STATUSES.has(String(data.status))) {
      await removeStoredActiveOrder();
      setActiveOrder(null);
      return;
    }

    setActiveOrder(data as ActiveOrder);
  }, [readStoredActiveOrder, removeStoredActiveOrder]);

  const loadHomeData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }

        await syncActiveOrder();
      } catch (error) {
        console.error("Home screen load error:", error);
        setErrorText("Не удалось загрузить данные. Попробуй обновить экран.");
      } finally {
        if (mode === "initial") {
          setIsInitialLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [syncActiveOrder]
  );

  useEffect(() => {
    loadHomeData("initial");
  }, [loadHomeData]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData("refresh");
    }, [loadHomeData])
  );

  const handleRefresh = useCallback(() => {
    loadHomeData("refresh");
  }, [loadHomeData]);

  const handleOpenActiveOrder = useCallback(() => {
    if (!activeOrder?.id) {
      Alert.alert("Активный заказ не найден");
      return;
    }

    router.push({
      pathname: "/order/active",
      params: {
        orderId: activeOrder.id,
      },
    });
  }, [activeOrder?.id, router]);

  const handleCreateOrder = useCallback(() => {
    router.push("/order/package");
  }, [router]);

  const handleOpenHistory = useCallback(() => {
    router.push("/order/history");
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>МусорОК</Text>
          <Text style={styles.subtitle}>
            Вынос бытового мусора по кнопке
          </Text>
        </View>

        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateText}>Загружаем данные...</Text>
          </View>
        ) : (
          <>
            {errorText ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Есть проблема с загрузкой</Text>
                <Text style={styles.errorText}>{errorText}</Text>

                <Pressable style={styles.secondaryButton} onPress={handleRefresh}>
                  <Text style={styles.secondaryButtonText}>Обновить</Text>
                </Pressable>
              </View>
            ) : null}

            {activeOrder ? (
              <View style={styles.activeOrderCard}>
                <View style={styles.activeOrderTopRow}>
                  <Text style={styles.cardTitle}>Активный заказ</Text>
                  <Pressable onPress={handleRefresh} hitSlop={10}>
                    <Text style={styles.refreshText}>Обновить</Text>
                  </Pressable>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{activeStatusLabel}</Text>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Адрес</Text>
                  <Text style={styles.infoValue}>
                    {activeOrder.address || "Адрес не указан"}
                  </Text>
                </View>

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.infoLabel}>Тариф</Text>
                    <Text style={styles.infoValue}>
                      {activeOrder.package_name || "—"}
                    </Text>
                  </View>

                  <View style={styles.rowItem}>
                    <Text style={styles.infoLabel}>Сумма</Text>
                    <Text style={styles.infoValue}>
                      {formatPrice(activeOrder.total_price)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.primaryButton}
                  onPress={handleOpenActiveOrder}
                >
                  <Text style={styles.primaryButtonText}>Открыть активный заказ</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Активных заказов нет</Text>
                <Text style={styles.emptyText}>
                  Создай новый заказ, и он появится здесь.
                </Text>

                <Pressable
                  style={styles.primaryButton}
                  onPress={handleCreateOrder}
                >
                  <Text style={styles.primaryButtonText}>Создать заказ</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.actionsBlock}>
              <Pressable style={styles.outlineButton} onPress={handleCreateOrder}>
                <Text style={styles.outlineButtonText}>Новый заказ</Text>
              </Pressable>

              <Pressable style={styles.outlineButton} onPress={handleOpenHistory}>
                <Text style={styles.outlineButtonText}>История заказов</Text>
              </Pressable>
            </View>

            <View style={styles.hintCard}>
              <Text style={styles.hintTitle}>Как это работает</Text>
              <Text style={styles.hintText}>
                Выбираешь тариф, указываешь детали, подтверждаешь заказ — курьер
                забирает мусор.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111111",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  stateText: {
    fontSize: 15,
    color: "#6B7280",
  },
  activeOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  activeOrderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E9281D",
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF1F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E9281D",
  },
  infoBlock: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: "#E9281D",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  actionsBlock: {
    flexDirection: "row",
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
  },
  hintCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  hintTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
  },
  hintText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
  },
  errorCard: {
    backgroundColor: "#FFF4F4",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFD6D3",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7F1D1D",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#991B1B",
  },
});