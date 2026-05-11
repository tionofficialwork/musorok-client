import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import StatusPill from "../../components/ui/StatusPill";
import { api } from "../../lib/api";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import {
  INACTIVE_ORDER_STATUSES,
  getOrderStatusLabel,
} from "../../lib/orderStatus";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type OrderHistoryRow = {
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
  owner_key: string | null;
};

type InfoRowProps = {
  label: string;
  value: string;
  rightAligned?: boolean;
};

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [orders, setOrders] = useState<OrderHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadHistory = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setErrorText(null);

      const { orders } = await api.orders.history();
      const inactiveOrders = (orders ?? []).filter((order) =>
        INACTIVE_ORDER_STATUSES.includes(order.status)
      );

      setOrders(inactiveOrders as OrderHistoryRow[]);
    } catch (error: any) {
      const message =
          typeof error?.message === "string"
              ? error.message
              : "Не удалось загрузить историю заказов.";
      setErrorText(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadHistory("initial");
      }, [loadHistory])
  );

  const handleRefresh = () => {
    loadHistory("refresh");
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleReorderPress = (orderId: string | number) => {
    router.push({
      pathname: "/order/reorder",
      params: {
        orderId: String(orderId),
      },
    });
  };

  const groupedOrders = useMemo(() => {
    const map = new Map<string, OrderHistoryRow[]>();

    for (const order of orders) {
      const key = formatDateGroup(order.created_at);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(order);
    }

    return Array.from(map.entries());
  }, [orders]);

  return (
      <>
        <Stack.Screen options={{ title: "История заказов" }} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {isLoading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.centerTitle}>Загружаем историю</Text>
                  <Text style={styles.centerText}>
                    Поднимаем завершённые и отменённые заказы.
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
                    <Text style={styles.title}>История</Text>
                    <Text style={styles.subtitle}>
                      Здесь хранятся завершённые и отменённые заказы. Из истории можно
                      быстро повторить нужный сценарий.
                    </Text>
                  </View>

                  {errorText ? (
                      <ScreenSection
                          title="Не удалось загрузить историю"
                          subtitle="Попробуй обновить экран ещё раз"
                      >
                        <AppCard>
                          <Text style={styles.errorText}>{errorText}</Text>
                          <View style={styles.errorAction}>
                            <AppButton title="Повторить" onPress={handleRefresh} />
                          </View>
                        </AppCard>
                      </ScreenSection>
                  ) : null}

                  {!errorText && orders.length > 0
                      ? groupedOrders.map(([groupTitle, groupOrders]) => (
                          <ScreenSection
                              key={groupTitle}
                              title={groupTitle}
                              subtitle={`${groupOrders.length} ${pluralizeOrders(groupOrders.length)}`}
                          >
                            <View style={styles.cards}>
                              {groupOrders.map((order) => (
                                  <AppCard key={String(order.id)}>
                                    <View style={styles.cardHeader}>
                                      <View style={styles.cardHeaderText}>
                                        <Text style={styles.orderId}>Заказ #{order.id}</Text>
                                        <Text style={styles.orderMeta}>
                                          {formatTime(order.created_at)} ·{" "}
                                          {order.package_label || "Без названия"}
                                        </Text>
                                      </View>

                                      <StatusPill
                                          status={order.status}
                                          label={getOrderStatusLabel(order.status)}
                                      />
                                    </View>

                                    <View style={styles.infoBlock}>
                                      <InfoRow
                                          label="Адрес"
                                          value={cleanAddressForDisplay(order.address) || "Не указан"}
                                          rightAligned
                                          styles={styles}
                                      />

                                      <Divider styles={styles} />

                                      <InfoRow
                                          label="Стоимость пакета"
                                          value={`${Number(order.package_price ?? 0)} ₽`}
                                          styles={styles}
                                      />

                                      <Divider styles={styles} />

                                      <InfoRow
                                          label="Чаевые"
                                          value={`${Number(order.tip ?? 0)} ₽`}
                                          styles={styles}
                                      />
                                    </View>

                                    {order.apartment || order.entrance ? (
                                        <View style={styles.noteBox}>
                                          <Text style={styles.noteTitle}>Детали адреса</Text>
                                          <Text style={styles.noteText}>
                                            {[
                                              order.apartment ? `кв. ${order.apartment}` : "",
                                              order.entrance ? `подъезд ${order.entrance}` : "",
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}
                                          </Text>
                                        </View>
                                    ) : null}

                                    {order.comment ? (
                                        <View style={styles.noteBox}>
                                          <Text style={styles.noteTitle}>Комментарий</Text>
                                          <Text style={styles.noteText}>{order.comment}</Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.totalBox}>
                                      <View>
                                        <Text style={styles.totalLabel}>Итого</Text>
                                        <Text style={styles.totalValue}>
                                          {Number(order.total ?? 0)} ₽
                                        </Text>
                                      </View>

                                      <View style={styles.reorderAction}>
                                        <AppButton
                                            title="Повторить"
                                            onPress={() => handleReorderPress(order.id)}
                                        />
                                      </View>
                                    </View>
                                  </AppCard>
                              ))}
                            </View>
                          </ScreenSection>
                      ))
                      : null}

                  <View style={styles.homeAction}>
                    <AppButton
                        title="В главное меню"
                        variant="secondary"
                        onPress={handleGoHome}
                    />
                  </View>
                </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </>
  );
}

function InfoRow({
                   label,
                   value,
                   rightAligned = false,
                   styles,
                 }: InfoRowProps & { styles: ReturnType<typeof createStyles> }) {
  return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
            style={[styles.infoValue, rightAligned ? styles.infoValueRight : undefined]}
        >
          {value}
        </Text>
      </View>
  );
}

function Divider({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.divider} />;
}

function formatDateGroup(value: string | null) {
  if (!value) {
    return "Без даты";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Без даты";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null) {
  if (!value) {
    return "Время неизвестно";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Время неизвестно";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function pluralizeOrders(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "заказ";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "заказа";
  }

  return "заказов";
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
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
      backgroundColor: colors.background,
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
    errorText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
    },
    errorAction: {
      marginTop: spacing.md,
    },
    cards: {
      gap: spacing.md,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    cardHeaderText: {
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
    infoBlock: {
      marginBottom: spacing.md,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    infoLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: typography.body,
      color: colors.textMuted,
    },
    infoValue: {
      minWidth: 0,
      flexShrink: 1,
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: colors.text,
    },
    infoValueRight: {
      flex: 1,
      textAlign: "right",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    noteBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    noteTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    noteText: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.textMuted,
    },
    totalBox: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    totalLabel: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    totalValue: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.text,
    },
    reorderAction: {
      minWidth: 132,
    },
    homeAction: {
      marginTop: spacing.sm,
    },
  });
}
