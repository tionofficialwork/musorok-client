import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import AppButton from "../components/ui/AppButton";
import AppCard from "../components/ui/AppCard";
import ScreenSection from "../components/ui/ScreenSection";
import { colors, radii, spacing, typography } from "../lib/theme";

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
        // ignore broken value
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
          <Text style={styles.subtitle}>Вынос бытового мусора по кнопке</Text>
        </View>

        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" />
            <Text style={styles.stateText}>Загружаем данные...</Text>
          </View>
        ) : (
          <ScreenSection>
            {errorText ? (
              <AppCard style={styles.errorCard}>
                <Text style={styles.errorTitle}>Есть проблема с загрузкой</Text>
                <Text style={styles.errorText}>{errorText}</Text>
                <AppButton
                  title="Обновить"
                  variant="secondary"
                  onPress={handleRefresh}
                />
              </AppCard>
            ) : null}

            {activeOrder ? (
              <AppCard>
                <View style={styles.activeOrderTopRow}>
                  <Text style={styles.cardTitle}>Активный заказ</Text>
                  <Text style={styles.refreshText} onPress={handleRefresh}>
                    Обновить
                  </Text>
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

                <AppButton
                  title="Открыть активный заказ"
                  onPress={handleOpenActiveOrder}
                />
              </AppCard>
            ) : (
              <AppCard>
                <Text style={styles.cardTitle}>Активных заказов нет</Text>
                <Text style={styles.emptyText}>
                  Создай новый заказ, и он появится здесь.
                </Text>
                <AppButton title="Создать заказ" onPress={handleCreateOrder} />
              </AppCard>
            )}

            <View style={styles.actionsBlock}>
              <View style={styles.actionItem}>
                <AppButton
                  title="Новый заказ"
                  variant="outline"
                  onPress={handleCreateOrder}
                />
              </View>

              <View style={styles.actionItem}>
                <AppButton
                  title="История заказов"
                  variant="outline"
                  onPress={handleOpenHistory}
                />
              </View>
            </View>

            <AppCard>
              <Text style={styles.hintTitle}>Как это работает</Text>
              <Text style={styles.hintText}>
                Выбираешь тариф, указываешь детали, подтверждаешь заказ — курьер
                забирает мусор.
              </Text>
            </AppCard>
          </ScreenSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: spacing.md,
  },
  stateText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  activeOrderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: "800",
    color: colors.text,
  },
  refreshText: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.primary,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  statusPillText: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  infoBlock: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowItem: {
    flex: 1,
    gap: spacing.xs,
  },
  actionsBlock: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionItem: {
    flex: 1,
  },
  emptyText: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  hintTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hintText: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    gap: spacing.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.errorTitle,
  },
  errorText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: colors.errorText,
  },
});