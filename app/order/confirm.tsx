import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import createOrder from "../../lib/createOrder";
import { colors, radii, spacing, typography } from "../../lib/theme";

type ConfirmParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
  address?: string;
  apartment?: string;
  entrance?: string;
  comment?: string;
  phone?: string;
  leaveAtDoor?: string;
  shouldCall?: string;
};

type PaymentMethod = "cash" | "card";
type TipOption = 0 | 49 | 99 | 149;

const TIP_OPTIONS: TipOption[] = [0, 49, 99, 149];

export default function OrderConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ConfirmParams>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "Выбранный пакет";
  const packagePrice = Number(
    typeof params.price === "string" ? params.price : "0"
  );

  const address = typeof params.address === "string" ? params.address : "";
  const apartment = typeof params.apartment === "string" ? params.apartment : "";
  const entrance = typeof params.entrance === "string" ? params.entrance : "";
  const comment = typeof params.comment === "string" ? params.comment : "";
  const phone = typeof params.phone === "string" ? params.phone : "";

  const leaveAtDoor =
    typeof params.leaveAtDoor === "string" ? params.leaveAtDoor === "true" : false;
  const shouldCall =
    typeof params.shouldCall === "string" ? params.shouldCall === "true" : true;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tip, setTip] = useState<TipOption>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => packagePrice + tip, [packagePrice, tip]);

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
        comment,
        leave_at_door: leaveAtDoor,
        phone,
        should_call: shouldCall,
        payment_method: paymentMethod,
        tip,
        total,
        call_required: shouldCall,
      });

      router.replace({
        pathname: "/order/success",
        params: {
          orderId: String(createdOrder.id ?? ""),
          packageName,
          price: String(packagePrice),
          tip: String(tip),
          total: String(total),
          address,
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
                Проверь итоговые данные, выбери способ оплаты и при желании оставь
                чаевые курьеру.
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
                  <Text style={styles.summaryValueRight}>{address}</Text>
                </View>

                {apartment || entrance ? (
                  <>
                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Детали адреса</Text>
                      <Text style={styles.summaryValueRight}>
                        {[apartment ? `кв. ${apartment}` : "", entrance ? `подъезд ${entrance}` : ""]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
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
                  <Text style={styles.summaryLabel}>Оставить у двери</Text>
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

            <ScreenSection
              title="Способ оплаты"
              subtitle="Поле уже сохраняется в заказ, даже если онлайн-оплата ещё в roadmap"
            >
              <View style={styles.selectGroup}>
                <SelectableCard
                  title="Наличными"
                  subtitle="Оплата при выполнении заказа"
                  selected={paymentMethod === "cash"}
                  onPress={() => setPaymentMethod("cash")}
                />

                <SelectableCard
                  title="Картой"
                  subtitle="Пока сохраняем как выбранный способ оплаты"
                  selected={paymentMethod === "card"}
                  onPress={() => setPaymentMethod("card")}
                />
              </View>
            </ScreenSection>

            <ScreenSection
              title="Чаевые курьеру"
              subtitle="Необязательно"
            >
              <View style={styles.tipWrap}>
                {TIP_OPTIONS.map((value) => (
                  <TipChip
                    key={value}
                    label={value === 0 ? "Без чаевых" : `+${value} ₽`}
                    active={tip === value}
                    onPress={() => setTip(value)}
                  />
                ))}
              </View>
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

type SelectableCardProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

function SelectableCard({
  title,
  subtitle,
  selected,
  onPress,
}: SelectableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectableCard,
        selected ? styles.selectableCardActive : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <View style={styles.selectableHeader}>
        <View style={styles.radioOuter}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>

        <View style={styles.selectableTextBlock}>
          <Text style={styles.selectableTitle}>{title}</Text>
          <Text style={styles.selectableSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

type TipChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TipChip({ label, active, onPress }: TipChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tipChip,
        active ? styles.tipChipActive : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <Text style={[styles.tipChipText, active ? styles.tipChipTextActive : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
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
    textAlign: "right",
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
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
  selectGroup: {
    gap: spacing.md,
  },
  selectableCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  selectableCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectableHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: colors.surface,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  selectableTextBlock: {
    flex: 1,
    gap: 4,
  },
  selectableTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  selectableSubtitle: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  tipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tipChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tipChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tipChipText: {
    fontSize: typography.body,
    fontWeight: "600",
    color: colors.text,
  },
  tipChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
  },
});