import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import InfoRow from "../../components/ui/InfoRow";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ScreenSection from "../../components/ui/ScreenSection";
import SectionTitle from "../../components/ui/SectionTitle";
import { createOrder } from "../../lib/createOrder";
import { colors, spacing, typography } from "../../lib/theme";

type ConfirmParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
  address?: string;
  apartment?: string;
  entrance?: string;
  comment?: string;
  leave_at_door?: string;
  call_required?: string;
};

function parseBooleanParam(value?: string) {
  return value === "true";
}

function formatPrice(price?: string) {
  if (!price) {
    return "—";
  }

  return `${price} ₽`;
}

export default function OrderConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ConfirmParams>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";
  const address = typeof params.address === "string" ? params.address : "";
  const apartment =
    typeof params.apartment === "string" ? params.apartment : "";
  const entrance = typeof params.entrance === "string" ? params.entrance : "";
  const comment = typeof params.comment === "string" ? params.comment : "";
  const leaveAtDoor = parseBooleanParam(
    typeof params.leave_at_door === "string" ? params.leave_at_door : undefined
  );
  const callRequired = parseBooleanParam(
    typeof params.call_required === "string" ? params.call_required : undefined
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailsRows = useMemo(
    () => [
      {
        label: "Адрес",
        value: address || "—",
      },
      {
        label: "Квартира",
        value: apartment || "Не указана",
      },
      {
        label: "Подъезд",
        value: entrance || "Не указан",
      },
      {
        label: "Комментарий",
        value: comment || "Нет комментария",
      },
      {
        label: "Оставить у двери",
        value: leaveAtDoor ? "Да" : "Нет",
      },
      {
        label: "Нужно позвонить",
        value: callRequired ? "Да" : "Нет",
      },
    ],
    [address, apartment, entrance, comment, leaveAtDoor, callRequired]
  );

  const handleCreateOrder = async () => {
    if (isSubmitting) {
      return;
    }

    if (!packageId || !packageName || !price || !address.trim()) {
      Alert.alert("Недостаточно данных", "Вернись назад и проверь заполнение заказа.");
      return;
    }

    try {
      setIsSubmitting(true);

      const order = await createOrder({
        package_id: packageId,
        package_name: packageName,
        total_price: Number(price),
        address: address.trim(),
        apartment: apartment.trim(),
        entrance: entrance.trim(),
        comment: comment.trim(),
        leave_at_door: leaveAtDoor,
        call_required: callRequired,
      });

      router.replace({
        pathname: "/order/success",
        params: {
          orderId: order.id,
        },
      });
    } catch (error) {
      console.error("Create order error:", error);
      Alert.alert(
        "Не удалось создать заказ",
        "Попробуй ещё раз. Если ошибка повторится, проверь интернет и настройки Supabase."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Подтверждение заказа" }} />

      <AppScreen>
        <ScreenSection>
          <ScreenHeader
            title="Проверь заказ"
            subtitle="Перед отправкой убедись, что все данные заполнены верно."
          />

          <AppCard>
            <SectionTitle>Тариф</SectionTitle>

            <View style={styles.summaryTopRow}>
              <Text style={styles.packageName}>
                {packageName || "Тариф не выбран"}
              </Text>
              <Text style={styles.price}>{formatPrice(price)}</Text>
            </View>
          </AppCard>

          <AppCard>
            <SectionTitle>Детали заказа</SectionTitle>

            <View style={styles.rows}>
              {detailsRows.map((row, index) => (
                <InfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  isLast={index === detailsRows.length - 1}
                />
              ))}
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.finalTitle}>Итого к оплате</Text>
            <View style={styles.finalRow}>
              <Text style={styles.finalLabel}>Сумма заказа</Text>
              <Text style={styles.finalPrice}>{formatPrice(price)}</Text>
            </View>

            <View style={styles.buttonWrap}>
              {isSubmitting ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.loadingButtonText}>Создаём заказ...</Text>
                </View>
              ) : (
                <AppButton title="Создать заказ" onPress={handleCreateOrder} />
              )}
            </View>

            <Text style={styles.bottomHint}>
              После создания заказ появится в системе и станет доступен курьеру.
            </Text>
          </AppCard>
        </ScreenSection>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  packageName: {
    flex: 1,
    fontSize: typography.h2,
    fontWeight: "800",
    color: colors.text,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  rows: {
    gap: 0,
  },
  finalTitle: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  finalRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  finalLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  buttonWrap: {
    marginTop: spacing.lg,
  },
  loadingButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingButtonText: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.white,
  },
  bottomHint: {
    marginTop: spacing.md,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});