import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
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

type OrderStatus =
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
  status?: OrderStatus | null;
  address?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  comment?: string | null;
  package_name?: string | null;
  total_price?: number | null;
  leave_at_door?: boolean | null;
  call_required?: boolean | null;
  created_at?: string | null;
};

type ActiveParams = {
  orderId?: string;
};

const ACTIVE_ORDER_STORAGE_KEYS = [
  "activeOrder",
  "active_order",
  "musorok_active_order",
];

const FINISHED_STATUSES = new Set(["completed", "cancelled"]);

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
      return "Заказ выполнен";
    case "cancelled":
      return "Заказ отменён";
    default:
      return "Статус обновляется";
  }
}

function getStatusDescription(status?: string | null) {
  switch (status) {
    case "new":
      return "Заказ создан и ожидает обработки.";
    case "searching":
      return "Система ищет свободного курьера.";
    case "assigned":
      return "Курьер уже назначен на заказ.";
    case "on_the_way":
      return "Курьер едет к тебе.";
    case "arrived":
      return "Курьер уже прибыл по адресу.";
    case "in_progress":
      return "Заказ сейчас выполняется.";
    case "completed":
      return "Заказ завершён и скоро появится в истории.";
    case "cancelled":
      return "Заказ был отменён.";
    default:
      return "Обнови экран чуть позже, чтобы увидеть актуальные данные.";
  }
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${value} ₽`;
}

function formatBoolean(value?: boolean | null) {
  return value ? "Да" : "Нет";
}

export default function ActiveOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ActiveParams>();

  const paramOrderId =
    typeof params.orderId === "string" ? params.orderId : undefined;

  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const statusLabel = useMemo(() => getStatusLabel(order?.status), [order?.status]);
  const statusDescription = useMemo(
    () => getStatusDescription(order?.status),
    [order?.status]
  );

  const readStoredActiveOrderId = useCallback(async () => {
    for (const key of ACTIVE_ORDER_STORAGE_KEYS) {
      const rawValue = await AsyncStorage.getItem(key);

      if (!rawValue) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawValue) as { id?: string } | null;

        if (parsed?.id) {
          return parsed.id;
        }
      } catch {
        // ignore broken storage value
      }
    }

    return undefined;
  }, []);

  const removeStoredActiveOrder = useCallback(async () => {
    await Promise.all(
      ACTIVE_ORDER_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key))
    );
  }, []);

  const resolveOrderId = useCallback(async () => {
    if (paramOrderId) {
      return paramOrderId;
    }

    return readStoredActiveOrderId();
  }, [paramOrderId, readStoredActiveOrderId]);

  const loadOrder = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        setErrorText(null);

        if (mode === "initial") {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const orderId = await resolveOrderId();

        if (!orderId) {
          setOrder(null);
          return;
        }

        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, status, address, apartment, entrance, comment, package_name:package_label, total_price:total, leave_at_door, call_required, created_at"
          )
          .eq("id", orderId)
          .single();

        if (error) {
          setErrorText("Не удалось загрузить активный заказ. Попробуй обновить экран.");
          return;
        }

        if (!data) {
          setOrder(null);
          setErrorText("Активный заказ не найден.");
          return;
        }

        if (FINISHED_STATUSES.has(String(data.status))) {
          await removeStoredActiveOrder();
        }

        setOrder(data as ActiveOrder);
      } catch (error) {
        console.error("Active order load error:", error);
        setErrorText("Произошла ошибка при загрузке заказа.");
      } finally {
        if (mode === "initial") {
          setIsInitialLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [removeStoredActiveOrder, resolveOrderId]
  );

  useEffect(() => {
    loadOrder("initial");
  }, [loadOrder]);

  useFocusEffect(
    useCallback(() => {
      loadOrder("refresh");
    }, [loadOrder])
  );

  const handleRefresh = useCallback(() => {
    loadOrder("refresh");
  }, [loadOrder]);

  const handleGoHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleOpenHistory = useCallback(() => {
    router.push("/order/history");
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "Активный заказ" }} />

      <AppScreen
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isInitialLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" />
            <Text style={styles.centerStateText}>Загружаем активный заказ...</Text>
          </View>
        ) : !order ? (
          <EmptyState
            title="Активного заказа нет"
            description="Когда создашь новый заказ, здесь появится его текущий статус."
            extraText={errorText}
            actions={
              <>
                <AppButton title="На главную" onPress={handleGoHome} />
                <AppButton
                  title="История заказов"
                  variant="outline"
                  onPress={handleOpenHistory}
                />
              </>
            }
          />
        ) : (
          <ScreenSection>
            <View style={styles.header}>
              <Text style={styles.title}>Активный заказ</Text>
              <Text style={styles.subtitle}>
                Здесь можно смотреть текущий статус и основные детали заказа.
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

            <AppCard>
              <View style={styles.topRow}>
                <Text style={styles.cardTitle}>Статус заказа</Text>
                <Text style={styles.refreshText} onPress={handleRefresh}>
                  Обновить
                </Text>
              </View>

              <StatusPill label={statusLabel} />

              <Text style={styles.statusDescription}>{statusDescription}</Text>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>Основная информация</Text>

              <View style={styles.rows}>
                <InfoRow label="Адрес" value={order.address || "—"} />
                <InfoRow label="Квартира" value={order.apartment || "Не указана"} />
                <InfoRow label="Подъезд" value={order.entrance || "Не указан"} />
                <InfoRow label="Тариф" value={order.package_name || "—"} />
                <InfoRow label="Сумма" value={formatPrice(order.total_price)} isLast />
              </View>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>Дополнительно</Text>

              <View style={styles.rows}>
                <InfoRow
                  label="Оставить у двери"
                  value={formatBoolean(order.leave_at_door)}
                />
                <InfoRow
                  label="Нужно позвонить"
                  value={formatBoolean(order.call_required)}
                />
                <InfoRow
                  label="Комментарий"
                  value={order.comment || "Нет комментария"}
                  isLast
                />
              </View>
            </AppCard>

            <View style={styles.buttons}>
              <AppButton title="Обновить статус" onPress={handleRefresh} />
              <AppButton
                title="История заказов"
                variant="outline"
                onPress={handleOpenHistory}
              />
              <AppButton
                title="На главную"
                variant="outline"
                onPress={handleGoHome}
              />
            </View>
          </ScreenSection>
        )}
      </AppScreen>
    </>
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
  centerStateText: {
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  refreshText: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.primary,
  },
  statusDescription: {
    marginTop: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  rows: {
    marginTop: spacing.md,
  },
  buttons: {
    gap: spacing.md,
  },
});