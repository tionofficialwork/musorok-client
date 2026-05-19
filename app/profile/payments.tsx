import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  clearSavedPaymentCard,
  DEFAULT_PAYMENT_PREFERENCES,
  getPaymentPreferences,
  savePaymentPreferences,
  type PaymentMethod,
  type PaymentPreferences,
} from "../../lib/paymentPreferences";
import { radii, shadows, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type PaymentTileProps = {
  title: string;
  subtitle: string;
  isSelected?: boolean;
  isMuted?: boolean;
  variant: "card" | "sbp" | "add";
  onPress: () => void;
};

export default function PaymentsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [preferences, setPreferences] = useState<PaymentPreferences>(
    DEFAULT_PAYMENT_PREFERENCES
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    DEFAULT_PAYMENT_PREFERENCES.defaultMethod
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingCard, setIsClearingCard] = useState(false);

  const savedCardLast4 = preferences.savedCardLast4;

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedPreferences = await getPaymentPreferences();
      setPreferences(loadedPreferences);
      setSelectedMethod(loadedPreferences.defaultMethod);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось загрузить настройки оплаты.";
      Alert.alert("Ошибка", message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const savedPreferences = await savePaymentPreferences({
        defaultMethod: selectedMethod,
      });
      setPreferences(savedPreferences);
      Alert.alert("Готово", "Способ оплаты сохранён.");
      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить способ оплаты.";
      Alert.alert("Ошибка", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCardInfo = () => {
    Alert.alert(
      "Привязка карты",
      "Сейчас карта сохраняется автоматически после успешной оплаты, если Т-Банк возвращает безопасную маску карты. Отдельную привязку карты подключим через сценарий AddCard, когда банк подтвердит режим сохранённых карт."
    );
  };

  const handleClearSavedCard = () => {
    if (isClearingCard || !savedCardLast4) {
      return;
    }

    Alert.alert(
      "Скрыть сохранённую карту?",
      "Мы удалим из MusorOK только последние 4 цифры и локальную привязку отображения. Банковские данные не хранятся в приложении.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Скрыть",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearingCard(true);
              const nextPreferences = await clearSavedPaymentCard();
              setPreferences(nextPreferences);
              setSelectedMethod(nextPreferences.defaultMethod);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Не удалось скрыть карту.";
              Alert.alert("Ошибка", message);
            } finally {
              setIsClearingCard(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Оплата" }} />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Загружаем способы оплаты...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Профиль</Text>
            <Text style={styles.title}>Способы оплаты</Text>
            <Text style={styles.subtitle}>
              Выбери способ по умолчанию. Полные данные карты остаются только на
              стороне банка.
            </Text>
          </View>

          <ScreenSection title="Основной способ">
            <AppCard>
              <Pressable
                onPress={() => setSelectedMethod("sbp")}
                style={({ pressed }) => [
                  styles.sbpPromo,
                  selectedMethod === "sbp" && styles.sbpPromoSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.sbpMark}>
                  <Text style={styles.sbpMarkText}>%</Text>
                </View>
                <View style={styles.sbpPromoCopy}>
                  <Text style={styles.sbpPromoTitle}>СБП без ввода карты</Text>
                  <Text style={styles.sbpPromoText}>
                    Быстрый вариант оплаты через приложение банка.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentRail}
              >
                <PaymentTile
                  title={savedCardLast4 ? `• ${savedCardLast4}` : "Карта"}
                  subtitle={
                    savedCardLast4 ? "сохранённая" : "через форму банка"
                  }
                  variant="card"
                  isSelected={selectedMethod === "card"}
                  onPress={() => setSelectedMethod("card")}
                  styles={styles}
                />

                <PaymentTile
                  title="СБП"
                  subtitle="быстро"
                  variant="sbp"
                  isSelected={selectedMethod === "sbp"}
                  onPress={() => setSelectedMethod("sbp")}
                  styles={styles}
                />

                <PaymentTile
                  title="Добавить"
                  subtitle="карту"
                  variant="add"
                  isMuted
                  onPress={handleAddCardInfo}
                  styles={styles}
                />
              </ScrollView>
            </AppCard>
          </ScreenSection>

          {savedCardLast4 ? (
            <ScreenSection title="Сохранённая карта">
              <AppCard>
                <View style={styles.savedCardRow}>
                  <View style={styles.largeCardIcon}>
                    <View style={styles.cardLine} />
                    <View style={styles.cardChip} />
                  </View>
                  <View style={styles.savedCardCopy}>
                    <Text style={styles.savedCardTitle}>Карта • {savedCardLast4}</Text>
                    <Text style={styles.savedCardText}>
                      Для отображения храним только последние 4 цифры.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleClearSavedCard}
                  disabled={isClearingCard}
                  style={({ pressed }) => [
                    styles.clearCardButton,
                    pressed && !isClearingCard && styles.pressed,
                    isClearingCard && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.clearCardButtonText}>
                    {isClearingCard ? "Скрываем..." : "Скрыть карту"}
                  </Text>
                </Pressable>
              </AppCard>
            </ScreenSection>
          ) : (
            <AppCard>
              <Text style={styles.emptyTitle}>Сохранённой карты пока нет</Text>
              <Text style={styles.emptyText}>
                После успешной оплаты Т-Банк может вернуть безопасную маску карты,
                и она появится здесь как быстрый способ выбора.
              </Text>
            </AppCard>
          )}

          <AppButton
            title={isSaving ? "Сохраняем..." : "Сохранить"}
            onPress={handleSave}
            disabled={isSaving || isClearingCard}
          />

          <AppButton
            title="Назад"
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSaving || isClearingCard}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PaymentTile({
  title,
  subtitle,
  isSelected = false,
  isMuted = false,
  variant,
  onPress,
  styles,
}: PaymentTileProps & { styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.paymentTile,
        isSelected && styles.paymentTileSelected,
        isMuted && styles.paymentTileMuted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.tileIconRow}>
        {variant === "card" ? (
          <View style={styles.cardIcon}>
            <View style={styles.cardIconLine} />
          </View>
        ) : null}
        {variant === "sbp" ? (
          <View style={styles.sbpIcon}>
            <Text style={styles.sbpIconText}>СБП</Text>
          </View>
        ) : null}
        {variant === "add" ? (
          <View style={styles.addIcon}>
            <Text style={styles.addIconText}>+</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.paymentTileTitle, isMuted && styles.mutedText]}>
        {title}
      </Text>
      <Text style={[styles.paymentTileSubtitle, isMuted && styles.mutedText]}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      backgroundColor: colors.background,
    },
    centerText: {
      fontSize: typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    hero: {
      gap: spacing.sm,
    },
    eyebrow: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
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
    sbpPromo: {
      minHeight: 78,
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    sbpPromoSelected: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    sbpMark: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      transform: [{ rotate: "-8deg" }],
    },
    sbpMarkText: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.white,
    },
    sbpPromoCopy: {
      flex: 1,
      gap: 2,
    },
    sbpPromoTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    sbpPromoText: {
      fontSize: typography.bodySmall,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    chevron: {
      fontSize: 30,
      lineHeight: 30,
      color: colors.text,
    },
    paymentRail: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      paddingRight: spacing.sm,
    },
    paymentTile: {
      width: 138,
      minHeight: 116,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      justifyContent: "space-between",
    },
    paymentTileSelected: {
      borderWidth: 2,
      borderColor: colors.text,
      backgroundColor: colors.surface,
      ...shadows.card,
    },
    paymentTileMuted: {
      backgroundColor: colors.surface,
      opacity: 0.72,
    },
    tileIconRow: {
      minHeight: 30,
      alignItems: "flex-start",
    },
    cardIcon: {
      width: 30,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.textMuted,
      justifyContent: "center",
    },
    cardIconLine: {
      height: 3,
      backgroundColor: colors.textMuted,
      marginHorizontal: 3,
      borderRadius: 999,
    },
    sbpIcon: {
      minWidth: 44,
      height: 26,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xs,
    },
    sbpIconText: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.primary,
    },
    addIcon: {
      width: 30,
      height: 30,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    addIconText: {
      fontSize: typography.h2,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textMuted,
    },
    paymentTileTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
    },
    paymentTileSubtitle: {
      fontSize: typography.bodySmall,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    mutedText: {
      color: colors.textMuted,
    },
    savedCardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    largeCardIcon: {
      width: 58,
      height: 42,
      borderRadius: radii.sm,
      borderWidth: 2,
      borderColor: colors.text,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.xs,
      justifyContent: "space-between",
    },
    cardLine: {
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.textMuted,
    },
    cardChip: {
      width: 18,
      height: 12,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    savedCardCopy: {
      flex: 1,
      gap: 3,
    },
    savedCardTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    savedCardText: {
      fontSize: typography.bodySmall,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    clearCardButton: {
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.md,
      backgroundColor: colors.errorBg,
    },
    clearCardButtonText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.errorText,
    },
    emptyTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.9,
    },
    disabledButton: {
      opacity: 0.6,
    },
  });
}
