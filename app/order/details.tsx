import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { supabase } from "../../lib/supabase";
import { colors, radii, spacing, typography } from "../../lib/theme";

type DetailsParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
};

function resolvePackageLabel(packageId: string, packageName: string) {
  if (packageName.trim()) {
    return packageName.trim();
  }

  switch (packageId) {
    case "small":
      return "Малый пакет";
    case "medium":
      return "Стандарт";
    case "large":
      return "Большой пакет";
    case "1":
      return "1 пакет";
    case "2-3":
      return "2-3 пакета";
    case "4+":
      return "4+ пакетов";
    default:
      return "Пакет";
  }
}

function resolvePackagePrice(rawPrice: string, packageId: string) {
  const parsed = Number(rawPrice);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  switch (packageId) {
    case "small":
      return 149;
    case "medium":
      return 249;
    case "large":
      return 349;
    case "1":
      return 99;
    case "2-3":
      return 149;
    case "4+":
      return 199;
    default:
      return 0;
  }
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<DetailsParams>();

  const packageId =
    typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const rawPrice = typeof params.price === "string" ? params.price : "";

  const resolvedPackageLabel = useMemo(
    () => resolvePackageLabel(packageId, packageName),
    [packageId, packageName]
  );

  const resolvedPackagePrice = useMemo(
    () => resolvePackagePrice(rawPrice, packageId),
    [rawPrice, packageId]
  );

  const [comment, setComment] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (loading) {
      return;
    }

    if (!address.trim()) {
      Alert.alert("Ошибка", "Введите адрес");
      return;
    }

    if (!packageId.trim()) {
      Alert.alert("Ошибка", "Не выбран пакет. Вернись назад и выбери тариф заново.");
      return;
    }

    try {
      setLoading(true);

      const orderPayload = {
        status: "new",
        address: address.trim(),
        package_id: packageId.trim(),
        package_label: resolvedPackageLabel,
        package_price: resolvedPackagePrice,
        apartment: "",
        entrance: "",
        comment: comment.trim(),
        leave_at_door: false,
        phone: "",
        should_call: false,
        payment_method: "cash",
        tip: 0,
        total: resolvedPackagePrice,
        courier_id: null,
        call_required: false,
      };

      const { data, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Заказ не вернулся после создания");
      }

      Alert.alert("Успех", "Заказ создан");

      router.replace("/");
    } catch (error: any) {
      Alert.alert(
        "Ошибка",
        typeof error?.message === "string"
          ? error.message
          : "Не удалось создать заказ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Детали заказа" }} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>Шаг 2 из 2</Text>
              <Text style={styles.title}>Укажи детали заказа</Text>
              <Text style={styles.subtitle}>
                Заполни адрес и комментарий. После этого заказ сразу создастся и появится в админке.
              </Text>
            </View>

            <ScreenSection
              title="Выбранный тариф"
              subtitle="Проверь пакет перед созданием заказа"
            >
              <AppCard>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryTitle}>{resolvedPackageLabel}</Text>
                    <Text style={styles.summarySubtitle}>
                      Стоимость фиксирована для выбранного тарифа.
                    </Text>
                  </View>

                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>{resolvedPackagePrice} ₽</Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Адрес"
              subtitle="Куда должен приехать курьер"
            >
              <AppCard>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Адрес</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Введите адрес"
                    placeholderTextColor={colors.textMuted}
                    value={address}
                    onChangeText={setAddress}
                    autoCapitalize="sentences"
                  />
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Комментарий"
              subtitle="Дополнительная информация для курьера"
            >
              <AppCard>
                <View style={styles.formGroupNoMargin}>
                  <Text style={styles.label}>Комментарий</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Например: домофон не работает"
                    placeholderTextColor={colors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Что будет дальше"
              subtitle="После нажатия на кнопку"
            >
              <AppCard>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Заказ создастся</Text>
                    <Text style={styles.stepText}>
                      Мы отправим заявку в таблицу `orders` со статусом `new`.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Он появится в админке</Text>
                    <Text style={styles.stepText}>
                      После создания заказ должен сразу отображаться в панели управления.
                    </Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              title={loading ? "Создание..." : "Создать заказ"}
              onPress={handleCreateOrder}
              disabled={loading}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  container: {
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  summaryTextBlock: {
    flex: 1,
    gap: 4,
  },
  summaryTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  priceBadge: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceBadgeText: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.primary,
  },
  formGroup: {
    marginBottom: spacing.xs,
  },
  formGroupNoMargin: {
    marginBottom: 0,
  },
  label: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
  },
  textarea: {
    minHeight: 120,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});