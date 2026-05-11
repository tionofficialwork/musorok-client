import {
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import createOrder from "../../lib/createOrder";
import { openOrderPaymentSession } from "../../lib/orderPaymentFlow";
import { isPaymentSuccessful } from "../../lib/payments";
import type { PaymentMethod } from "../../lib/paymentPreferences";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type ConfirmParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
  address?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  addressLabel?: string;
  comment?: string;
  phone?: string;
  leaveAtDoor?: string;
  shouldCall?: string;
  paymentMethod?: string;
  tip?: string;
  total?: string;
  latitude?: string;
  longitude?: string;
};

function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "sbp" ? "СБП" : "Карта";
}

function parseTip(value: string | undefined) {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 0;
}

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAddressDetails(params: {
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
}) {
  return [
    params.apartment ? `кв. ${params.apartment}` : "",
    params.entrance ? `подъезд ${params.entrance}` : "",
    params.floor ? `этаж ${params.floor}` : "",
    params.intercom ? `домофон ${params.intercom}` : "",
  ]
      .filter(Boolean)
      .join(", ");
}

export default function OrderConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ConfirmParams>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
      typeof params.packageName === "string" ? params.packageName : "Выбранный пакет";
  const packagePrice = Number(
      typeof params.price === "string" ? params.price : "0"
  );

  const address =
      typeof params.address === "string" ? cleanAddressForDisplay(params.address) : "";
  const apartment = typeof params.apartment === "string" ? params.apartment : "";
  const entrance = typeof params.entrance === "string" ? params.entrance : "";
  const floor = typeof params.floor === "string" ? params.floor : "";
  const intercom = typeof params.intercom === "string" ? params.intercom : "";
  const addressLabel =
      typeof params.addressLabel === "string"
          ? cleanAddressForDisplay(params.addressLabel)
          : "";
  const effectiveAddressLabel = useMemo(() => {
    if (!addressLabel) {
      return "";
    }

    return addressLabel.toLowerCase() === address.toLowerCase()
        ? ""
        : addressLabel;
  }, [address, addressLabel]);
  const comment = typeof params.comment === "string" ? params.comment : "";
  const phone = typeof params.phone === "string" ? params.phone : "";

  const latitude = parseCoordinate(
      typeof params.latitude === "string" ? params.latitude : undefined
  );
  const longitude = parseCoordinate(
      typeof params.longitude === "string" ? params.longitude : undefined
  );

  const leaveAtDoor =
      typeof params.leaveAtDoor === "string" ? params.leaveAtDoor === "true" : false;
  const shouldCall =
      typeof params.shouldCall === "string" ? params.shouldCall === "true" : true;

  const paymentMethod: PaymentMethod = params.paymentMethod === "sbp" ? "sbp" : "card";
  const tip = useMemo(
      () => parseTip(typeof params.tip === "string" ? params.tip : undefined),
      [params.tip]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => packagePrice + tip, [packagePrice, tip]);

  const addressDetails = useMemo(() => {
    return buildAddressDetails({
      apartment,
      entrance,
      floor,
      intercom,
    });
  }, [apartment, entrance, floor, intercom]);

  const handleCreateOrder = async () => {
    if (isSubmitting) {
      return;
    }

    if (!packageId || !address || !phone) {
      Alert.alert(
          "Не хватает данных",
          "Похоже, часть данных заказа потерялась. Вернись на предыдущий шаг и проверь форму."
      );
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert(
          "Адрес не подтверждён",
          "Вернись назад и подтверди адрес на карте."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const createdOrder = await createOrder({
        status: "new",
        address,
        package_id: packageId,
        package_label: packageName,
        package_price: packagePrice,
        apartment,
        entrance,
        floor,
        intercom,
        address_label: effectiveAddressLabel,
        latitude,
        longitude,
        comment,
        leave_at_door: leaveAtDoor,
        phone,
        should_call: shouldCall,
        payment_method: paymentMethod,
        tip,
        total,
        call_required: shouldCall,
      });
      const orderId = String(createdOrder.id);
      let checkedPayment: Awaited<ReturnType<typeof openOrderPaymentSession>>;

      try {
        checkedPayment = await openOrderPaymentSession(orderId);
      } catch (paymentError: any) {
        router.replace({
          pathname: "/order/payment-return" as never,
          params: {
            orderId,
            result: "init_error",
            message:
                typeof paymentError?.message === "string"
                    ? paymentError.message
                    : "Не удалось открыть оплату.",
          },
        });
        return;
      }

      if (!isPaymentSuccessful(checkedPayment)) {
        router.replace({
          pathname: "/order/payment-return" as never,
          params: {
            orderId,
            result: checkedPayment.status === "failed" ? "fail" : "pending",
          },
        });
        return;
      }

      router.replace({
        pathname: "/order/success",
        params: {
          orderId,
          packageName: createdOrder.package_label ?? packageName,
          price: String(createdOrder.package_price ?? packagePrice),
          tip: String(createdOrder.tip ?? tip),
          total: String(createdOrder.total ?? total),
          address: createdOrder.address ?? address,
          paymentStatus: checkedPayment.status,
        },
      });
    } catch (error: any) {
      const message =
          typeof error?.message === "string"
              ? error.message
              : "Не удалось создать заказ. Попробуй ещё раз.";

      Alert.alert("Ошибка создания заказа", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <>
        <Stack.Screen options={{ title: "Подтверждение" }} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>Шаг 3 из 3</Text>
                <Text style={styles.title}>Подтверди заказ</Text>
                <Text style={styles.subtitle}>
                  Проверь итоговые данные перед созданием заказа.
                </Text>
              </View>

              <ScreenSection
                  title="Состав заказа"
                  subtitle="Основная информация перед отправкой"
              >
                <AppCard>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Пакет</Text>
                    <Text style={styles.summaryValue}>{packageName}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Адрес</Text>
                    <View style={styles.addressValueBlock}>
                      {effectiveAddressLabel ? (
                          <Text style={styles.summaryValueRight}>
                            {effectiveAddressLabel}
                          </Text>
                      ) : null}
                      <Text
                          style={[
                            styles.summaryValueRight,
                            effectiveAddressLabel
                                ? styles.addressValueSecondary
                                : undefined,
                          ]}
                      >
                        {address}
                      </Text>
                    </View>
                  </View>

                  {addressDetails ? (
                      <>
                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Детали адреса</Text>
                          <Text style={styles.summaryValueRight}>{addressDetails}</Text>
                        </View>
                      </>
                  ) : null}

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Телефон</Text>
                    <Text style={styles.summaryValue}>{phone}</Text>
                  </View>

                  {comment ? (
                      <>
                        <View style={styles.divider} />

                        <View style={styles.noteBox}>
                          <Text style={styles.noteTitle}>Комментарий для курьера</Text>
                          <Text style={styles.noteText}>{comment}</Text>
                        </View>
                      </>
                  ) : null}
                </AppCard>
              </ScreenSection>

              <ScreenSection
                  title="Параметры выполнения"
                  subtitle="Как курьеру лучше взаимодействовать с заказом"
              >
                <AppCard>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Забрать у двери</Text>
                    <Text style={styles.summaryValue}>
                      {leaveAtDoor ? "Да" : "Нет"}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Позвонить заранее</Text>
                    <Text style={styles.summaryValue}>
                      {shouldCall ? "Да" : "Нет"}
                    </Text>
                  </View>
                </AppCard>
              </ScreenSection>

              <ScreenSection title="Оплата">
                <AppCard>
                  <View style={styles.paymentMethodCard}>
                    <Text style={styles.paymentMethodTitle}>
                      {getPaymentMethodLabel(paymentMethod)}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Способ оплаты уже зафиксирован и будет передан при создании заказа.
                    </Text>
                  </View>
                </AppCard>
              </ScreenSection>

              <ScreenSection
                  title="Итог"
                  subtitle="Финальная сумма перед созданием заказа"
              >
                <AppCard>
                  <View style={styles.priceRow}>
                    <Text style={styles.summaryLabel}>Пакет</Text>
                    <Text style={styles.summaryValue}>{packagePrice} ₽</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.priceRow}>
                    <Text style={styles.summaryLabel}>Способ оплаты</Text>
                    <Text style={styles.summaryValue}>
                      {getPaymentMethodLabel(paymentMethod)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.priceRow}>
                    <Text style={styles.summaryLabel}>Чаевые</Text>
                    <Text style={styles.summaryValue}>{tip} ₽</Text>
                  </View>

                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Итого к оплате</Text>
                    <Text style={styles.totalValue}>{total} ₽</Text>
                  </View>
                </AppCard>
              </ScreenSection>
            </ScrollView>

            <View style={styles.footer}>
              <AppButton
                  title={isSubmitting ? "Создаём заказ..." : "Подтвердить заказ"}
                  onPress={handleCreateOrder}
                  disabled={isSubmitting}
              />
              <AppButton
                  title="Назад"
                  variant="secondary"
                  onPress={() => router.back()}
                  disabled={isSubmitting}
              />
            </View>

            {isSubmitting ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : null}
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
      paddingBottom: 120,
      gap: spacing.lg,
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
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
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
    addressValueBlock: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      alignItems: "flex-end",
    },
    addressValueSecondary: {
      color: colors.textMuted,
      fontWeight: "500",
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
    paymentMethodCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.primarySoft,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    paymentMethodTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.primary,
    },
    paymentMethodSubtitle: {
      fontSize: typography.body,
      lineHeight: 21,
      color: colors.text,
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
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: spacing.sm,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
