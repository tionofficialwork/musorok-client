import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import EmptyState from "../../components/ui/EmptyState";
import ErrorCard from "../../components/ui/ErrorCard";
import InfoRow from "../../components/ui/InfoRow";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";
import { supabase } from "../../lib/supabase";
import { colors, spacing, typography } from "../../lib/theme";

type HistoryOrderStatus =
  | "new"
  | "searching"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | string;

type HistoryOrder = {
  id: string;
  status?: HistoryOrderStatus | null;
  address?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  comment?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  total_price?: number | null;
  leave_at_door?: boolean | null;
  call_required?: boolean | null;
  created_at?: string | null;
};

const ACTIVE_ORDER_ALLOWED_STATUSES = new Set([
  "new",
  "searching",
  "assigned",
  "on_the_way",
  "arrived",
  "in_progress",
]);

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

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value} ₽`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function OrderHistoryScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      setErrorText(null);

      if (mode === "initial") {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, address, apartment, entrance, comment, package_id, package_name, total_price, leave_at_door, call_required, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorText("Не удалось загрузить историю заказов. Попробуй обновить экран.");
        return;
      }

      setOrders((data ?? []) as HistoryOrder[]);
    } catch (error) {
      console.error("History load error:", error);
      setErrorText("Произошла ошибка при загрузке истории заказов.");
    } finally {
      if (mode === "initial") {
        setIsInitialLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadOrders("initial");
  }, [loadOrders]);

  const handleRefresh = useCallback(() => {
    loadOrders("refresh");
  }, [loadOrders]);

  const handleOpenOrder = useCallback(
    (order: HistoryOrder) => {
      const orderStatus = String(order.status ?? "");

      if (ACTIVE_ORDER_ALLOWED_STATUSES.has(orderStatus)) {
        router.push({
          pathname: "/order/active",
          params: {
            orderId: order.id,
          },
        });
        return;
      }

      router.push({
        pathname: "/order/success",
        params: {
          orderId: order.id,
        },
      });
    },
    [router]
  );

  const handleReorder = useCallback(
    (order: HistoryOrder) => {
      router.push({
        pathname: "/order/details",
        params: {
          packageId: order.package_id ?? "",
          packageName: order.package_name ?? "",
          price:
            typeof order.total_price === "number"
              ? String(order.total_price)
              : "",
        },
      });
    },
    [router]
  );

  const handleCreateOrder = useCallback(() => {
    router.push("/order/package");
  }, [router]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {isInitialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" />
          <Text style={styles.centerText}>Загружаем историю заказов...</Text>
        </View>
      ) : !hasOrders ? (
        <EmptyState
          title="История заказов пуста"
          description="Когда появятся оформленные заказы, они будут отображаться здесь."
          extraText={errorText}
          actions={
            <>
              <AppButton title="Создать заказ" onPress={handleCreateOrder} />
              <AppButton
                title="Обновить"
                variant="outline"
                onPress={handleRefresh}
              />
            </>
          }
        />
      ) : (
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>История заказов</Text>
            <Text style={styles.subtitle}>
              Здесь хранятся все оформленные заказы. Можно обновить список,
              открыть заказ и быстро повторить его.
            </Text>
          </View>

          {errorText ? (
            <ErrorCard
              title="Не удалось полностью обновить данные"
              description={errorText}
            >
              <AppButton
                title="Обновить"
                variant="secondary"
                onPress={handleRefresh}
              />
            </ErrorCard>
          ) : null}

          <View style={styles.list}>
            {orders.map((order) => (
              <AppCard key={order.id} style={styles.orderCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTopText}>
                    <Text style={styles.addressText}>
                      {order.address || "Адрес не указан"}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDate(order.created_at)}
                    </Text>
                  </View>

                  <StatusPill label={getStatusLabel(order.status)} />
                </View>

                <View style={styles.infoList}>
                  <InfoRow label="Тариф" value={order.package_name || "—"} />
                  <InfoRow label="Сумма" value={formatPrice(order.total_price)} />
                  <InfoRow label="Квартира" value={order.apartment || "Не указана"} />
                  <InfoRow label="Подъезд" value={order.entrance || "Не указан"} />
                  <InfoRow
                    label="Комментарий"
                    value={order.comment || "Нет комментария"}
                    isLast
                  />
                </View>

                <View style={styles.cardButtons}>
                  <AppButton
                    title={
                      ACTIVE_ORDER_ALLOWED_STATUSES.has(String(order.status ?? ""))
                        ? "Открыть заказ"
                        : "Открыть"
                    }
                    onPress={() => handleOpenOrder(order)}
                  />
                  <AppButton
                    title="Повторить"
                    variant="outline"
                    onPress={() => handleReorder(order)}
                  />
                </View>
              </AppCard>
            ))}
          </View>
        </ScreenSection>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  centerText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
  },
  orderCard: {
    gap: spacing.md,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  cardTopText: {
    flex: 1,
    gap: spacing.xs,
  },
  addressText: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  dateText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  infoList: {
    marginTop: spacing.xs,
  },
  cardButtons: {
    gap: spacing.md,
  },
});