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
import ErrorCard from "../components/ui/ErrorCard";
import ScreenSection from "../components/ui/ScreenSection";
import StatusPill from "../components/ui/StatusPill";

type ActiveOrder = {
  id: string;
  status: string | null;
  address: string | null;
  package_label: string | null;
  package_price: number | null;
  total: number | null;
  created_at: string | null;
};

const ACTIVE_ORDER_STORAGE_KEY = "active_order_id";

export default function HomeScreen() {
  const router = useRouter();

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOrderCreatedAt = useMemo(() => {
    if (!activeOrder?.created_at) {
      return null;
    }

    const date = new Date(activeOrder.created_at);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [activeOrder?.created_at]);

  const loadActiveOrder = useCallback(async () => {
    try {
      setError(null);

      const storedOrderId = await AsyncStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);

      if (!storedOrderId) {
        setActiveOrder(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("id, status, address, package_label, package_price, total, created_at")
        .eq("id", storedOrderId)
        .single();

      if (fetchError) {
        await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        setActiveOrder(null);
        return;
      }

      if (!data) {
        await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        setActiveOrder(null);
        return;
      }

      const normalizedStatus = (data.status || "").toLowerCase();

      if (normalizedStatus === "completed" || normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
        await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
        setActiveOrder(null);
        return;
      }

      setActiveOrder(data);
    } catch (e) {
      setError("Не удалось загрузить активный заказ.");
    }
  }, []);

  const loadScreen = useCallback(async () => {
    setLoading(true);
    await loadActiveOrder();
    setLoading(false);
  }, [loadActiveOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActiveOrder();
    setRefreshing(false);
  }, [loadActiveOrder]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen]);

  useFocusEffect(
    useCallback(() => {
      loadActiveOrder();
    }, [loadActiveOrder])
  );

  const handleNewOrder = () => {
    router.push("/order/package");
  };

  const handleOpenActiveOrder = () => {
    if (!activeOrder?.id) {
      Alert.alert("Нет активного заказа", "Сейчас у вас нет активного заказа.");
      return;
    }

    router.push("/order/active");
  };

  const handleOpenHistory = () => {
    router.push("/order/history");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#E9281D" />
          <Text style={styles.loaderText}>Загружаем данные...</Text>
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
          title="МусорОК"
          subtitle="Сервис выноса бытового мусора по кнопке"
        >
          <AppCard style={styles.heroCard}>
            <Text style={styles.heroTitle}>Вынесем мусор за вас</Text>
            <Text style={styles.heroText}>
              Оформите заказ за пару минут — курьер заберёт мусор по указанному адресу.
            </Text>

            <AppButton title="Создать заказ" onPress={handleNewOrder} style={styles.heroButton} />
          </AppCard>
        </ScreenSection>

        {error ? (
          <ErrorCard
            message={error}
            onRetry={loadScreen}
            style={styles.sectionSpacing}
          />
        ) : null}

        <ScreenSection
          title="Активный заказ"
          subtitle="Здесь отображается ваш текущий заказ, если он есть"
        >
          {activeOrder ? (
            <AppCard>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Заказ #{activeOrder.id.slice(0, 8)}</Text>
                <StatusPill status={activeOrder.status} />
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.label}>Адрес</Text>
                <Text style={styles.value}>{activeOrder.address || "Не указан"}</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoGridItem}>
                  <Text style={styles.label}>Тариф</Text>
                  <Text style={styles.value}>{activeOrder.package_label || "—"}</Text>
                </View>

                <View style={styles.infoGridItem}>
                  <Text style={styles.label}>Сумма</Text>
                  <Text style={styles.value}>
                    {typeof activeOrder.total === "number"
                      ? `${activeOrder.total} ₽`
                      : typeof activeOrder.package_price === "number"
                      ? `${activeOrder.package_price} ₽`
                      : "—"}
                  </Text>
                </View>
              </View>

              {activeOrderCreatedAt ? (
                <View style={styles.infoBlock}>
                  <Text style={styles.label}>Создан</Text>
                  <Text style={styles.value}>{activeOrderCreatedAt}</Text>
                </View>
              ) : null}

              <AppButton
                title="Открыть активный заказ"
                variant="secondary"
                onPress={handleOpenActiveOrder}
                style={styles.cardButton}
              />
            </AppCard>
          ) : (
            <AppCard>
              <Text style={styles.emptyTitle}>Пока нет активного заказа</Text>
              <Text style={styles.emptyText}>
                Создайте новый заказ, и здесь появится карточка с его статусом.
              </Text>

              <AppButton
                title="Создать заказ"
                onPress={handleNewOrder}
                style={styles.cardButton}
              />
            </AppCard>
          )}
        </ScreenSection>

        <ScreenSection
          title="История"
          subtitle="Открывайте прошлые заказы и повторяйте их в пару нажатий"
        >
          <AppCard>
            <Text style={styles.historyTitle}>История заказов</Text>
            <Text style={styles.historyText}>
              Посмотрите завершённые и отменённые заказы, а также быстро повторите нужный.
            </Text>

            <AppButton
              title="Открыть историю"
              variant="secondary"
              onPress={handleOpenHistory}
              style={styles.cardButton}
            />
          </AppCard>
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
  sectionSpacing: {
    marginBottom: 20,
  },
  heroCard: {
    paddingVertical: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  heroText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
  },
  heroButton: {
    marginTop: 18,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
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
  cardButton: {
    marginTop: 18,
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
  historyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  historyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
  },
});