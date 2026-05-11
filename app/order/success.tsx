import {
  useCallback,
  useMemo,
} from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import { getPaymentStatusLabel } from "../../lib/payments";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type SuccessParams = {
  orderId?: string;
  packageName?: string;
  price?: string;
  tip?: string;
  total?: string;
  address?: string;
  paymentStatus?: string;
};

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SuccessParams>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const packageName =
      typeof params.packageName === "string" && params.packageName.trim()
          ? params.packageName
          : "";
  const price =
      typeof params.price === "string" && params.price.trim() ? params.price : "";
  const tip = typeof params.tip === "string" && params.tip.trim() ? params.tip : "";
  const total =
      typeof params.total === "string" && params.total.trim() ? params.total : "";
  const address =
      typeof params.address === "string"
          ? cleanAddressForDisplay(params.address) || ""
          : "";
  const paymentStatus =
      typeof params.paymentStatus === "string" ? params.paymentStatus : "";

  const handleOpenActiveOrder = () => {
    router.replace("/order/active");
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  useFocusEffect(
      useCallback(() => {
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            () => true
        );

        return () => subscription.remove();
      }, [])
  );

  return (
      <>
        <Stack.Screen
            options={{
              title: "Заказ создан",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroCard}>
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>✓</Text>
                </View>

                <Text style={styles.eyebrow}>Заказ успешно создан</Text>
                <Text style={styles.title}>Курьер скоро увидит заявку</Text>
              </View>

              <ScreenSection
                  title="Сводка по заказу"
                  subtitle="Проверь основные данные созданной заявки"
              >
                <AppCard>
                  {orderId ? (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>ID заказа</Text>
                          <Text style={styles.summaryValue}>#{orderId}</Text>
                        </View>

                        <View style={styles.divider} />
                      </>
                  ) : null}

                  {packageName ? (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Пакет</Text>
                          <Text style={styles.summaryValueRight}>{packageName}</Text>
                        </View>

                        <View style={styles.divider} />
                      </>
                  ) : null}

                  {address ? (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Адрес</Text>
                          <Text style={styles.summaryValueRight}>{address}</Text>
                        </View>

                        <View style={styles.divider} />
                      </>
                  ) : null}

                  {price ? (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Стоимость пакета</Text>
                          <Text style={styles.summaryValue}>{price} ₽</Text>
                        </View>

                        <View style={styles.divider} />
                      </>
                  ) : null}

                  {tip ? (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Чаевые</Text>
                          <Text style={styles.summaryValue}>{tip} ₽</Text>
                        </View>
                      </>
                  ) : null}

                  {total ? (
                      <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Итого</Text>
                        <Text style={styles.totalValue}>{total} ₽</Text>
                      </View>
                  ) : null}

                  {paymentStatus ? (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Статус оплаты</Text>
                          <Text style={styles.summaryValue}>
                            {getPaymentStatusLabel(paymentStatus)}
                          </Text>
                        </View>
                      </>
                  ) : null}
                </AppCard>
              </ScreenSection>

              <ScreenSection title="Что дальше">
                <AppCard>
                  <View style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Заказ появится в активных</Text>
                      <Text style={styles.stepText}>
                        Экран активного заказа покажет текущий статус и основную
                        информацию.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepDivider} />

                  <View style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Курьер примет заявку</Text>
                      <Text style={styles.stepText}>
                        Когда заказ будет взят в работу, статус обновится в приложении.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepDivider} />

                  <View style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Заказ уйдёт в историю</Text>
                      <Text style={styles.stepText}>
                        После завершения или отмены он больше не останется активным.
                      </Text>
                    </View>
                  </View>
                </AppCard>
              </ScreenSection>
            </ScrollView>

            <View style={styles.footer}>
              <AppButton
                  title="Перейти к активному заказу"
                  onPress={handleOpenActiveOrder}
              />
              <View style={styles.footerSpacer} />
              <AppButton
                  title="В главное меню"
                  onPress={handleGoHome}
                  variant="secondary"
              />
            </View>
          </View>
        </SafeAreaView>
      </>
  );
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
      paddingBottom: 180,
      gap: spacing.lg,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      marginBottom: spacing.xs,
    },
    icon: {
      fontSize: 34,
      fontWeight: "800",
      color: colors.primary,
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
      textAlign: "center",
    },
    subtitle: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    summaryLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: typography.body,
      color: colors.textMuted,
    },
    summaryValue: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    summaryValueRight: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
      textAlign: "right",
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    totalBox: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    totalLabel: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    totalValue: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.text,
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
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    footerSpacer: {
      height: spacing.sm,
    },
  });
}
