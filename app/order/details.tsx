import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { colors, radii, spacing, typography } from "../../lib/theme";

type DetailsParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<DetailsParams>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "Выбранный пакет";
  const price = typeof params.price === "string" ? params.price : "0";

  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [comment, setComment] = useState("");
  const [phone, setPhone] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [shouldCall, setShouldCall] = useState(true);

  const isFormValid = useMemo(() => {
    return address.trim().length > 5 && phone.trim().length >= 10;
  }, [address, phone]);

  const handleContinue = () => {
    if (!address.trim()) {
      Alert.alert("Проверь адрес", "Укажи адрес, откуда нужно забрать мусор.");
      return;
    }

    if (address.trim().length < 5) {
      Alert.alert("Проверь адрес", "Адрес выглядит слишком коротким.");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("Проверь телефон", "Укажи номер телефона для связи.");
      return;
    }

    if (phone.trim().length < 10) {
      Alert.alert("Проверь телефон", "Номер телефона выглядит слишком коротким.");
      return;
    }

    router.push({
      pathname: "/order/confirm",
      params: {
        packageId,
        packageName,
        price,
        address: address.trim(),
        apartment: apartment.trim(),
        entrance: entrance.trim(),
        comment: comment.trim(),
        phone: phone.trim(),
        leaveAtDoor: String(leaveAtDoor),
        shouldCall: String(shouldCall),
      },
    });
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>Шаг 2 из 3</Text>
              <Text style={styles.title}>Заполни детали заказа</Text>
              <Text style={styles.subtitle}>
                Укажи адрес, контакт и важные комментарии для курьера.
              </Text>
            </View>

            <ScreenSection
              title="Выбранный пакет"
              subtitle="Проверь, что выбран нужный тариф перед подтверждением"
            >
              <AppCard>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextBlock}>
                    <Text style={styles.summaryTitle}>{packageName}</Text>
                    <Text style={styles.summarySubtitle}>
                      Стоимость заказа фиксируется на следующем шаге.
                    </Text>
                  </View>

                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>{price} ₽</Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Адрес и контакт"
              subtitle="Эти данные нужны, чтобы курьер быстро нашёл тебя"
            >
              <AppCard>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Адрес</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Улица, дом"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Квартира</Text>
                    <TextInput
                      value={apartment}
                      onChangeText={setApartment}
                      placeholder="Например, 24"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <View style={[styles.formGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Подъезд</Text>
                    <TextInput
                      value={entrance}
                      onChangeText={setEntrance}
                      placeholder="Например, 2"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Телефон</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+7 999 123-45-67"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Комментарий для курьера</Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Например: код домофона, где стоят пакеты, как лучше зайти"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.textArea]}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Дополнительные настройки"
              subtitle="Тонкая настройка поведения курьера"
            >
              <AppCard>
                <View style={styles.optionRow}>
                  <View style={styles.optionTextBlock}>
                    <Text style={styles.optionTitle}>Оставить у двери</Text>
                    <Text style={styles.optionText}>
                      Подходит, если пакеты уже готовы и их можно забрать без контакта.
                    </Text>
                  </View>
                  <Switch
                    value={leaveAtDoor}
                    onValueChange={setLeaveAtDoor}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={colors.surface}
                  />
                </View>

                <View style={styles.optionDivider} />

                <View style={styles.optionRow}>
                  <View style={styles.optionTextBlock}>
                    <Text style={styles.optionTitle}>Позвонить перед выносом</Text>
                    <Text style={styles.optionText}>
                      Курьер свяжется с тобой перед тем, как начать выполнение заказа.
                    </Text>
                  </View>
                  <Switch
                    value={shouldCall}
                    onValueChange={setShouldCall}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={colors.surface}
                  />
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Что будет дальше"
              subtitle="Финальный шаг перед созданием заказа"
            >
              <AppCard>
                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Проверишь данные</Text>
                    <Text style={styles.stepText}>
                      На следующем экране увидишь итоговую сводку заказа.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Подтвердишь заказ</Text>
                    <Text style={styles.stepText}>
                      После подтверждения заказ создастся в Supabase и станет активным.
                    </Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              title="Продолжить"
              onPress={handleContinue}
              disabled={!isFormValid}
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
    marginBottom: spacing.md,
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
  textArea: {
    minHeight: 112,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  optionTextBlock: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  optionText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  optionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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