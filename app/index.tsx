import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AppButton from "../components/ui/AppButton";
import AppCard from "../components/ui/AppCard";
import ErrorCard from "../components/ui/ErrorCard";
import ScreenSection from "../components/ui/ScreenSection";
import StatusPill from "../components/ui/StatusPill";
import {
  clearActiveOrder,
  getActiveOrder,
  isActiveOrderStatus,
  syncActiveOrder,
  type StoredActiveOrder,
} from "../lib/activeOrder";
import { supabase } from "../lib/supabase";
import { colors, radii, spacing, typography } from "../lib/theme";

type OrderRow = {
  id: string | number;
  created_at: string | null;
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

const ACTIVE_STATUSES = [
  "pending",
  "assigned",
  "accepted",
  "in_progress",
  "on_the_way",
];

export default function HomeScreen() {
  const router = useRouter();

  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const applyStoredOrder = useCallback(async () => {
    const storedOrder = await getActiveOrder();

    if (storedOrder) {
      setActiveOrder(mapStoredOrderToOrderRow(storedOrder));
      return true;
    }

    return false;
  }, []);

  const loadHomeData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
          await applyStoredOrder();
        } else {
          setIsRefreshing(true);
        }

        setErrorText(null);

        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, created_at, status, address, package_id, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, courier_id, call_required"
          )
          .in("status", ACTIVE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        const nextOrder =
          Array.isArray(data) && data.length > 0 ? (data[0] as OrderRow) : null;

        setActiveOrder(nextOrder);

        if (nextOrder) {
          await syncActiveOrder(nextOrder);
        } else {
          await clearActiveOrder();
        }
      } catch (error: any) {
        const hasStored = await applyStoredOrder();

        const message =
          typeof error?.message === "string"
            ? error.message
            : "Не удалось загрузить данные главного экрана.";

        setErrorText(
          hasStored
            ? `Показан локально сохранённый активный заказ. ${message}`
            : message
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyStoredOrder]
  );

  useFocusEffect(
    useCallback(() => {
      loadHomeData("initial");
    }, [loadHomeData])
  );

  const handleRefresh = () => {
    loadHomeData("refresh");
  };

  const handleCreateOrder = () => {
    router.push("/order/package");
  };

  const handleOpenActive = () => {
    router.push("/order/active");
  };

  const handleOpenHistory = () => {
    router.push("/order/history");
  };

  const handleOpenProfile = () => {
    router.push("/profile");
  };

  const activeOrderStatusLabel = useMemo(
    () => getStatusLabel(activeOrder?.status ?? null),
    [activeOrder?.status]
  );

  const activeOrderStatusTone = useMemo(
    () => getStatusTone(activeOrder?.status ?? null),
    [activeOrder?.status]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerTitle}>Загружаем МусорОК</Text>
            <Text style={styles.centerText}>
              Проверяем локальные данные и обновляем активный заказ из Supabase.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>МусорОК</Text>
              <Text style={styles.title}>Вынос мусора по кнопке</Text>
              <Text style={styles.subtitle}>
                Быстро создавай заказ, следи за активной заявкой и возвращайся к
                прошлым заказам в пару нажатий.
              </Text>
            </View>

            <ScreenSection
              title="Быстрые действия"
              subtitle="Главные сценарии клиента в одном месте"
            >
              <AppCard>
                <AppButton title="Создать заказ" onPress={handleCreateOrder} />
                <View style={styles.actionSpacer} />
                <AppButton title="Активный заказ" onPress={handleOpenActive} />
                <View style={styles.actionSpacer} />
                <AppButton title="История заказов" onPress={handleOpenHistory} />
                <View style={styles.actionSpacer} />
                <AppButton title="Профиль" onPress={handleOpenProfile} />
              </AppCard>
            </ScreenSection>

            {errorText ? (
              <ErrorCard
                title="Проблема с загрузкой"
                description={errorText}
                actionLabel="Повторить"
                onAction={handleRefresh}
              />
            ) : null}

            {activeOrder ? (
              <ScreenSection title="Активный заказ" subtitle="То, что сейчас в работе">
                <AppCard>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderText}>
                      <Text style={styles.orderId}>Заказ #{activeOrder.id}</Text>
                      <Text style={styles.orderMeta}>
                        {activeOrder.package_label || "Без названия"} ·{" "}
                        {formatCreatedAt(activeOrder.created_at)}
                      </Text>
                    </View>

                    <StatusPill
                      label={activeOrderStatusLabel}
                      tone={activeOrderStatusTone}
                    />
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxTitle}>Адрес</Text>
                    <Text style={styles.infoBoxText}>
                      {activeOrder.address || "Адрес не указан"}
                    </Text>
                  </View>

                  <View style={styles.summaryList}>
                    <InfoRow
                      label="Стоимость пакета"
                      value={`${Number(activeOrder.package_price ?? 0)} ₽`}
                    />
                    <Divider />
                    <InfoRow
                      label="Чаевые"
                      value={`${Number(activeOrder.tip ?? 0)} ₽`}
                    />
                    <Divider />
                    <InfoRow
                      label="Итого"
                      value={`${Number(activeOrder.total ?? 0)} ₽`}
                      strong
                    />
                  </View>

                  <View style={styles.cardFooter}>
                    <AppButton
                      title="Открыть активный заказ"
                      onPress={handleOpenActive}
                    />
                  </View>
                </AppCard>
              </ScreenSection>
            ) : (
              <ScreenSection
                title="Сейчас активного заказа нет"
                subtitle="Можно создать новый заказ прямо сейчас"
              >
                <AppCard>
                  <View style={styles.emptyIconWrap}>
                    <Text style={styles.emptyIcon}>🗑️</Text>
                  </View>

                  <Text style={styles.emptyTitle}>Готовы забрать мусор</Text>
                  <Text style={styles.emptyText}>
                    Создай заказ, укажи адрес и детали — дальше заявка появится на
                    экране активного заказа.
                  </Text>

                  <View style={styles.cardFooter}>
                    <AppButton
                      title="Создать новый заказ"
                      onPress={handleCreateOrder}
                    />
                  </View>
                </AppCard>
              </ScreenSection>
            )}

            <ScreenSection
              title="Как это работает"
              subtitle="Коротко про основной пользовательский путь"
            >
              <AppCard>
                <StepRow
                  index="1"
                  title="Выбираешь пакет"
                  text="Подбираешь подходящий объём мусора под текущую ситуацию."
                />
                <StepDivider />
                <StepRow
                  index="2"
                  title="Заполняешь детали"
                  text="Указываешь адрес, телефон, комментарий и нужные настройки."
                />
                <StepDivider />
                <StepRow
                  index="3"
                  title="Подтверждаешь заказ"
                  text="После подтверждения заказ создаётся в Supabase и становится активным."
                />
              </AppCard>
            </ScreenSection>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

function InfoRow({ label, value, strong = false }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, strong ? styles.infoLabelStrong : undefined]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, strong ? styles.infoValueStrong : undefined]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

type StepRowProps = {
  index: string;
  title: string;
  text: string;
};

function StepRow({ index, title, text }: StepRowProps) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{index}</Text>
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function StepDivider() {
  return <View style={styles.stepDivider} />;
}

function mapStoredOrderToOrderRow(order: StoredActiveOrder): OrderRow | null {
  if (order.id === null || order.id === undefined) {
    return null;
  }

  if (!isActiveOrderStatus(order.status ?? null)) {
    return null;
  }

  return {
    id: order.id,
    created_at: order.created_at ?? null,
    status: order.status ?? null,
    address: order.address ?? null,
    package_id: order.package_id ?? null,
    package_label: order.package_label ?? null,
    package_price: order.package_price ?? null,
    apartment: order.apartment ?? null,
    entrance: order.entrance ?? null,
    comment: order.comment ?? null,
    leave_at_door: order.leave_at_door ?? null,
    phone: order.phone ?? null,
    should_call: order.should_call ?? null,
    payment_method: order.payment_method ?? null,
    tip: order.tip ?? null,
    total: order.total ?? null,
    courier_id: order.courier_id ?? null,
    call_required: order.call_required ?? null,
  };
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "pending":
      return "В поиске курьера";
    case "assigned":
      return "Курьер назначен";
    case "accepted":
      return "Заказ принят";
    case "in_progress":
      return "Выполняется";
    case "on_the_way":
      return "Курьер в пути";
    default:
      return "Активен";
  }
}

function getStatusTone(status: string | null): "warning" | "success" | "default" {
  switch (status) {
    case "pending":
      return "warning";
    case "assigned":
    case "accepted":
    case "in_progress":
    case "on_the_way":
      return "success";
    default:
      return "default";
  }
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return "время неизвестно";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "время неизвестно";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  centerTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  centerText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
  hero: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actionSpacer: {
    height: spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  orderHeaderText: {
    flex: 1,
    gap: 4,
  },
  orderId: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  orderMeta: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  infoBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBoxTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  summaryList: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  infoLabelStrong: {
    fontWeight: "700",
    color: colors.text,
  },
  infoValue: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  infoValueStrong: {
    fontSize: typography.h3,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardFooter: {
    marginTop: spacing.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  stepBadgeText: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  stepText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});