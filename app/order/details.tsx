import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getPaymentPreferences } from "../../lib/paymentPreferences";
import { getProfileOwnerKey } from "../../lib/profileIdentity";
import { supabase } from "../../lib/supabase";
import { colors, radii, spacing, typography } from "../../lib/theme";

type DetailsParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
};

type PaymentMethod = "cash" | "card";

type PrefillState = {
  address: string;
  phone: string;
  shouldCall: boolean;
  paymentMethod: PaymentMethod;
  tip: number;
  profileName: string;
};

type AddressRow = {
  street?: string | null;
  address?: string | null;
  label?: string | null;
  is_primary?: boolean | null;
  primary?: boolean | null;
  is_default?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type ProfileRow = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  call_allowed?: boolean | null;
};

const TIP_PRESETS = [0, 50, 100, 150, 200];

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

function getAddressValue(row: AddressRow | null | undefined) {
  if (!row) {
    return "";
  }

  if (typeof row.street === "string" && row.street.trim().length > 0) {
    return row.street.trim();
  }

  if (typeof row.address === "string" && row.address.trim().length > 0) {
    return row.address.trim();
  }

  return "";
}

function selectBestAddress(rows: AddressRow[]) {
  if (!rows.length) {
    return null;
  }

  const primaryRow =
    rows.find((row) => row.is_primary === true) ??
    rows.find((row) => row.primary === true) ??
    rows.find((row) => row.is_default === true);

  if (primaryRow) {
    return primaryRow;
  }

  return rows[0];
}

function buildProfileName(row: ProfileRow | null) {
  if (!row) {
    return "";
  }

  const firstName =
    typeof row.first_name === "string" ? row.first_name.trim() : "";
  const lastName =
    typeof row.last_name === "string" ? row.last_name.trim() : "";

  return [firstName, lastName].filter(Boolean).join(" ");
}

function getMaskedPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    return value;
  }

  const lastFour = digits.slice(-4);
  return `••• •• ${lastFour}`;
}

function normalizeOrderPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("8") && digits.length === 11) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (value.trim().startsWith("+") && digits.length >= 11) {
    return `+${digits}`;
  }

  return value.trim();
}

function formatPhonePreview(value: string) {
  const normalized = normalizeOrderPhoneInput(value);
  const digits = normalized.replace(/\D/g, "");

  if (digits.length !== 11 || digits[0] !== "7") {
    return normalized;
  }

  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
    7,
    9
  )}-${digits.slice(9, 11)}`;
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
  const [phone, setPhone] = useState("");
  const [shouldCall, setShouldCall] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tip, setTip] = useState(0);

  const [prefill, setPrefill] = useState<PrefillState>({
    address: "",
    phone: "",
    shouldCall: false,
    paymentMethod: "cash",
    tip: 0,
    profileName: "",
  });

  const [isPrefillLoading, setIsPrefillLoading] = useState(true);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrefill = async () => {
      try {
        setIsPrefillLoading(true);
        setPrefillError(null);

        const ownerKey = await getProfileOwnerKey();

        const [
          { data: profileData, error: profileError },
          { data: addressData, error: addressError },
          paymentPreferences,
        ] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("first_name, last_name, phone, call_allowed")
            .eq("owner_key", ownerKey)
            .maybeSingle<ProfileRow>(),
          supabase
            .from("user_addresses")
            .select("*")
            .eq("owner_key", ownerKey)
            .limit(10),
          getPaymentPreferences(),
        ]);

        if (profileError) {
          throw profileError;
        }

        if (addressError) {
          throw addressError;
        }

        const profileRow = (profileData as ProfileRow | null) ?? null;
        const addressRows = Array.isArray(addressData)
          ? (addressData as AddressRow[])
          : [];
        const selectedAddress = selectBestAddress(addressRows);
        const selectedAddressValue = getAddressValue(selectedAddress);

        const nextPrefill: PrefillState = {
          address: selectedAddressValue,
          phone:
            typeof profileRow?.phone === "string" ? profileRow.phone.trim() : "",
          shouldCall: profileRow?.call_allowed === true,
          paymentMethod:
            paymentPreferences.defaultMethod === "card" ? "card" : "cash",
          tip:
            typeof paymentPreferences.defaultTip === "number" &&
            Number.isFinite(paymentPreferences.defaultTip) &&
            paymentPreferences.defaultTip >= 0
              ? paymentPreferences.defaultTip
              : 0,
          profileName: buildProfileName(profileRow),
        };

        if (!isMounted) {
          return;
        }

        setPrefill(nextPrefill);

        if (selectedAddressValue) {
          setAddress((current) =>
            current.trim().length > 0 ? current : selectedAddressValue
          );
        }

        if (nextPrefill.phone) {
          setPhone((current) =>
            current.trim().length > 0 ? current : nextPrefill.phone
          );
        }

        setShouldCall(nextPrefill.shouldCall);
        setPaymentMethod(nextPrefill.paymentMethod);
        setTip(nextPrefill.tip);
      } catch (error) {
        console.error("Failed to load order prefill", error);

        if (!isMounted) {
          return;
        }

        setPrefillError(
          "Не удалось подтянуть сохранённые данные. Заказ всё равно можно оформить вручную."
        );
      } finally {
        if (isMounted) {
          setIsPrefillLoading(false);
        }
      }
    };

    loadPrefill();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasAnyPrefill = useMemo(() => {
    return Boolean(
      prefill.address ||
        prefill.phone ||
        prefill.profileName ||
        prefill.tip > 0 ||
        prefill.paymentMethod
    );
  }, [prefill]);

  const displayPaymentMethod = useMemo(() => {
    return paymentMethod === "card" ? "Карта" : "Наличные";
  }, [paymentMethod]);

  const totalPreview = useMemo(() => {
    return resolvedPackagePrice + tip;
  }, [resolvedPackagePrice, tip]);

  const normalizedPhone = useMemo(() => normalizeOrderPhoneInput(phone), [phone]);

  const handleContinueToConfirm = async () => {
    if (loading) {
      return;
    }

    if (!address.trim()) {
      Alert.alert("Ошибка", "Введите адрес");
      return;
    }

    if (!packageId.trim()) {
      Alert.alert(
        "Ошибка",
        "Не выбран пакет. Вернись назад и выбери тариф заново."
      );
      return;
    }

    if (!normalizedPhone.trim()) {
      Alert.alert("Ошибка", "Введите телефон");
      return;
    }

    try {
      setLoading(true);

      router.push({
        pathname: "/order/confirm",
        params: {
          packageId: packageId.trim(),
          packageName: resolvedPackageLabel,
          price: String(resolvedPackagePrice),
          address: address.trim(),
          apartment: "",
          entrance: "",
          comment: comment.trim(),
          phone: normalizedPhone,
          leaveAtDoor: "false",
          shouldCall: String(shouldCall),
          paymentMethod,
          tip: String(tip),
          total: String(totalPreview),
        },
      });
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
              <Text style={styles.eyebrow}>Шаг 2 из 3</Text>
              <Text style={styles.title}>Укажи детали заказа</Text>
              <Text style={styles.subtitle}>
                Заполни адрес и комментарий. На следующем шаге ты проверишь итоговые
                данные и подтвердишь заказ.
              </Text>
            </View>

            <ScreenSection
              title="Выбранный тариф"
              subtitle="Проверь пакет перед подтверждением заказа"
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
                    <Text style={styles.priceBadgeText}>
                      {resolvedPackagePrice} ₽
                    </Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Автоподстановка"
              subtitle="Используем сохранённые данные, чтобы ускорить оформление"
            >
              <AppCard>
                {isPrefillLoading ? (
                  <View style={styles.prefillLoadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.prefillLoadingText}>
                      Подтягиваем профиль, адрес и оплату...
                    </Text>
                  </View>
                ) : hasAnyPrefill ? (
                  <View style={styles.prefillList}>
                    {prefill.profileName ? (
                      <View style={styles.prefillRow}>
                        <Text style={styles.prefillLabel}>Профиль</Text>
                        <Text style={styles.prefillValue}>
                          {prefill.profileName}
                        </Text>
                      </View>
                    ) : null}

                    {prefill.phone ? (
                      <View style={styles.prefillRow}>
                        <Text style={styles.prefillLabel}>Телефон</Text>
                        <Text style={styles.prefillValue}>
                          {getMaskedPhone(prefill.phone)}
                        </Text>
                      </View>
                    ) : null}

                    {prefill.address ? (
                      <View style={styles.prefillRow}>
                        <Text style={styles.prefillLabel}>Адрес</Text>
                        <Text style={styles.prefillValue}>{prefill.address}</Text>
                      </View>
                    ) : null}

                    <View style={styles.prefillRow}>
                      <Text style={styles.prefillLabel}>Оплата</Text>
                      <Text style={styles.prefillValue}>
                        {prefill.paymentMethod === "card" ? "Карта" : "Наличные"}
                      </Text>
                    </View>

                    <View style={styles.prefillRow}>
                      <Text style={styles.prefillLabel}>Чаевые</Text>
                      <Text style={styles.prefillValue}>{prefill.tip} ₽</Text>
                    </View>

                    <View style={styles.prefillRow}>
                      <Text style={styles.prefillLabel}>Звонок курьера</Text>
                      <Text style={styles.prefillValue}>
                        {prefill.shouldCall ? "Разрешён" : "Не обязателен"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.prefillEmptyText}>
                    Сохранённых данных пока нет. Заказ можно оформить вручную.
                  </Text>
                )}

                {prefillError ? (
                  <Text style={styles.prefillErrorText}>{prefillError}</Text>
                ) : null}
              </AppCard>
            </ScreenSection>

            <ScreenSection title="Адрес" subtitle="Куда должен приехать курьер">
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
              title="Контакты"
              subtitle="Можно быстро уточнить номер и необходимость звонка для этого заказа"
            >
              <AppCard>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Телефон для связи</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+7 999 123-45-67"
                    placeholderTextColor={colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.helperText}>
                    В заказ уйдёт: {normalizedPhone ? formatPhonePreview(normalizedPhone) : "номер не указан"}
                  </Text>
                </View>

                <View style={styles.contactDivider} />

                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Нужен звонок курьера</Text>
                    <Text style={styles.switchSubtitle}>
                      Включи, если курьеру лучше позвонить перед выносом мусора.
                    </Text>
                  </View>

                  <Switch
                    value={shouldCall}
                    onValueChange={setShouldCall}
                    disabled={loading}
                  />
                </View>
              </AppCard>
            </ScreenSection>

            <ScreenSection
              title="Оплата"
              subtitle="Можно быстро скорректировать метод и чаевые перед заказом"
            >
              <AppCard>
                <Text style={styles.label}>Метод оплаты</Text>
                <View style={styles.optionGroup}>
                  <ChoiceButton
                    title="Карта"
                    isSelected={paymentMethod === "card"}
                    onPress={() => setPaymentMethod("card")}
                    disabled={loading}
                  />
                  <ChoiceButton
                    title="Наличные"
                    isSelected={paymentMethod === "cash"}
                    onPress={() => setPaymentMethod("cash")}
                    disabled={loading}
                  />
                </View>

                <View style={styles.paymentDivider} />

                <Text style={styles.label}>Чаевые</Text>
                <View style={styles.optionGroup}>
                  {TIP_PRESETS.map((value) => (
                    <ChoiceButton
                      key={value}
                      title={value === 0 ? "Без чаевых" : `${value} ₽`}
                      isSelected={tip === value}
                      onPress={() => setTip(value)}
                      disabled={loading}
                    />
                  ))}
                </View>

                <View style={styles.paymentSummaryBox}>
                  <InfoRow label="Метод оплаты" value={displayPaymentMethod} />
                  <View style={styles.summaryDivider} />
                  <InfoRow label="Чаевые" value={`${tip} ₽`} />
                  <View style={styles.summaryDivider} />
                  <InfoRow label="Итого" value={`${totalPreview} ₽`} strong />
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
                    <Text style={styles.stepTitle}>Проверишь заказ</Text>
                    <Text style={styles.stepText}>
                      На следующем шаге увидишь итоговые данные, оплату и чаевые.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Подтвердишь создание</Text>
                    <Text style={styles.stepText}>
                      После подтверждения заказ создастся через общий createOrder flow.
                    </Text>
                  </View>
                </View>
              </AppCard>
            </ScreenSection>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              title={loading ? "Переходим..." : "Продолжить"}
              onPress={handleContinueToConfirm}
              disabled={loading}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

type ChoiceButtonProps = {
  title: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

function ChoiceButton({
  title,
  isSelected,
  onPress,
  disabled = false,
}: ChoiceButtonProps) {
  return (
    <AppButton
      title={title}
      onPress={onPress}
      variant={isSelected ? "primary" : "secondary"}
      disabled={disabled}
      fullWidth
    />
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
  prefillLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  prefillLoadingText: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  prefillList: {
    gap: spacing.sm,
  },
  prefillRow: {
    gap: 4,
  },
  prefillLabel: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  prefillValue: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.text,
  },
  prefillEmptyText: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  prefillErrorText: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    lineHeight: 21,
    color: "#ef4444",
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
  helperText: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textMuted,
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
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  switchTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtitle: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  paymentSummaryBox: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
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
  summaryDivider: {
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