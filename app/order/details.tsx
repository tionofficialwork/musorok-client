import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import RussianPhoneInput, {
  getRussianPhoneNationalDigits,
} from "../../components/ui/RussianPhoneInput";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  getPaymentPreferences,
  type PaymentMethod,
} from "../../lib/paymentPreferences";
import { api } from "../../lib/api";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import {
  formatRussianPhoneInput,
  isValidRussianPhone,
  sanitizeRussianPhoneInput,
} from "../../lib/auth";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type DetailsParams = {
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
  latitude?: string;
  longitude?: string;
  phone?: string;
  shouldCall?: string;
  paymentMethod?: string;
  tip?: string;
};

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
const MAX_TIP_RUBLES = 1000;
function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "sbp" ? "СБП" : "Карта";
}

function resolvePackageLabel(packageId: string, packageName: string) {
  if (packageName.trim()) {
    return packageName.trim();
  }

  switch (packageId) {
    case "s":
      return "S · Маленький пакет";
    case "m":
      return "M · Средний пакет";
    case "l":
      return "L · Большой пакет";
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
    case "s":
      return 139;
    case "m":
      return 189;
    case "l":
      return 249;
    default:
      return 0;
  }
}

function getAddressValue(row: AddressRow | null | undefined) {
  if (!row) {
    return "";
  }

  if (typeof row.street === "string" && row.street.trim().length > 0) {
    return cleanAddressForDisplay(row.street);
  }

  if (typeof row.address === "string" && row.address.trim().length > 0) {
    return cleanAddressForDisplay(row.address);
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

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<DetailsParams>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const packageId =
      typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
      typeof params.packageName === "string" ? params.packageName : "";
  const rawPrice = typeof params.price === "string" ? params.price : "";

  const selectedAddress =
      typeof params.address === "string" ? cleanAddressForDisplay(params.address) : "";
  const selectedApartment =
      typeof params.apartment === "string" ? params.apartment : "";
  const selectedEntrance =
      typeof params.entrance === "string" ? params.entrance : "";
  const selectedFloor = typeof params.floor === "string" ? params.floor : "";
  const selectedIntercom =
      typeof params.intercom === "string" ? params.intercom : "";
  const selectedAddressLabel =
      typeof params.addressLabel === "string"
          ? cleanAddressForDisplay(params.addressLabel)
          : "";
  const selectedComment =
      typeof params.comment === "string" ? params.comment : "";
  const selectedLatitude =
      typeof params.latitude === "string" ? params.latitude : "";
  const selectedLongitude =
      typeof params.longitude === "string" ? params.longitude : "";

  const resolvedPackageLabel = useMemo(
      () => resolvePackageLabel(packageId, packageName),
      [packageId, packageName]
  );

  const resolvedPackagePrice = useMemo(
      () => resolvePackagePrice(rawPrice, packageId),
      [rawPrice, packageId]
  );

  const [phone, setPhone] = useState(
      typeof params.phone === "string" ? params.phone : ""
  );
  const [shouldCall, setShouldCall] = useState(
      typeof params.shouldCall === "string" ? params.shouldCall === "true" : false
  );
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
      params.paymentMethod === "sbp" ? "sbp" : "card"
  );
  const [tip, setTip] = useState(() => {
    const rawTip = typeof params.tip === "string" ? Number(params.tip) : NaN;
    return Number.isFinite(rawTip) && rawTip >= 0 ? rawTip : 0;
  });

  const [prefill, setPrefill] = useState<PrefillState>({
    address: "",
    phone: "",
    shouldCall: false,
    paymentMethod: "card",
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

        const [
          { profile: profileData },
          { addresses: addressData },
          paymentPreferences,
        ] = await Promise.all([
          api.profile.get(),
          api.addresses.list(),
          getPaymentPreferences(),
        ]);

        const profileRow = (profileData as ProfileRow | null) ?? null;
        const addressRows = Array.isArray(addressData)
            ? (addressData as AddressRow[])
            : [];
        const selectedSavedAddress = selectBestAddress(addressRows);
        const selectedSavedAddressValue = getAddressValue(selectedSavedAddress);

        const nextPrefill: PrefillState = {
          address: selectedSavedAddressValue,
          phone:
              typeof profileRow?.phone === "string" ? profileRow.phone.trim() : "",
          shouldCall: profileRow?.call_allowed === true,
          paymentMethod: paymentPreferences.defaultMethod,
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

        if (nextPrefill.phone) {
          setPhone((current) =>
              current.trim().length > 0 ? current : nextPrefill.phone
          );
        }

        setShouldCall((current) => {
          const hasExplicitParam = typeof params.shouldCall === "string";
          return hasExplicitParam ? current : nextPrefill.shouldCall;
        });

        setPaymentMethod((current) => {
          const hasExplicitParam = typeof params.paymentMethod === "string";
          return hasExplicitParam ? current : nextPrefill.paymentMethod;
        });

        setTip((current) => {
          const hasExplicitParam = typeof params.tip === "string";
          return hasExplicitParam ? current : nextPrefill.tip;
        });
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
  }, [params.shouldCall, params.tip]);

  const hasAnyPrefill = useMemo(() => {
    return Boolean(
        prefill.address ||
        prefill.phone ||
        prefill.profileName ||
        prefill.tip > 0 ||
        prefill.paymentMethod
    );
  }, [prefill]);

  const totalPreview = useMemo(() => {
    return resolvedPackagePrice + tip;
  }, [resolvedPackagePrice, tip]);

  const handleManualTipChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 5);
    const nextTip = digits.length > 0 ? Number(digits) : 0;
    setTip(Math.min(nextTip, MAX_TIP_RUBLES));
  };

  const phoneDigits = useMemo(
      () => getRussianPhoneNationalDigits(phone),
      [phone]
  );
  const normalizedPhone = useMemo(() => sanitizeRussianPhoneInput(phone), [phone]);
  const isPhoneValid = isValidRussianPhone(normalizedPhone);

  const handlePhoneDigitsChange = (digits: string) => {
    setPhone(`+7${digits}`);
  };

  const handleOpenMap = async () => {
    if (loading) {
      return;
    }

    if (!packageId.trim()) {
      Alert.alert(
          "Ошибка",
          "Не выбран пакет. Вернись назад и выбери тариф заново."
      );
      return;
    }

    if (!isPhoneValid) {
      Alert.alert("Ошибка", "Введите телефон в формате +7 (999) 123-45-67");
      return;
    }

    router.push({
      pathname: "/order/map",
      params: {
        packageId: packageId.trim(),
        packageName: resolvedPackageLabel,
        price: String(resolvedPackagePrice),
        address: selectedAddress || prefill.address || "",
        apartment: selectedApartment,
        entrance: selectedEntrance,
        floor: selectedFloor,
        intercom: selectedIntercom,
        addressLabel: selectedAddressLabel,
        comment: selectedComment,
        latitude: selectedLatitude,
        longitude: selectedLongitude,
        phone: normalizedPhone,
        shouldCall: String(shouldCall),
        leaveAtDoor: String(leaveAtDoor),
        paymentMethod,
        tip: String(tip),
        total: String(totalPreview),
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
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>Шаг 2 из 3</Text>
                <Text style={styles.title}>Укажи детали заказа</Text>
                <Text style={styles.subtitle}>
                  Сначала проверь контакты и оплату, потом выбери точку на карте и
                  заполни детали адреса.
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
                  title="Ваши данные"
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
                              <Text style={styles.prefillValue}>{prefill.profileName}</Text>
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
                              <Text style={styles.prefillLabel}>Последний адрес</Text>
                              <Text style={styles.prefillValue}>{prefill.address}</Text>
                            </View>
                        ) : null}

                        <View style={styles.prefillRow}>
                          <Text style={styles.prefillLabel}>Оплата</Text>
                          <Text style={styles.prefillValue}>
                            {getPaymentMethodLabel(prefill.paymentMethod)}
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

              <ScreenSection
                  title="Контакты"
                  subtitle="Можно быстро уточнить номер и необходимость звонка для этого заказа"
              >
                <AppCard>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Телефон для связи</Text>
                    <RussianPhoneInput
                        digits={phoneDigits}
                        onChangeDigits={handlePhoneDigitsChange}
                        editable={!loading}
                        containerStyle={styles.phoneInputBox}
                        focusedContainerStyle={styles.phoneInputBoxFocused}
                        textStyle={styles.phoneInputText}
                        placeholderTextStyle={styles.phoneInputPlaceholder}
                    />
                    <Text style={styles.helperText}>
                      В заказ уйдёт:{" "}
                      {isPhoneValid
                          ? formatRussianPhoneInput(normalizedPhone)
                          : "номер не указан"}
                    </Text>
                  </View>

                  <View style={styles.contactDivider} />

                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Забрать у двери</Text>
                      <Text style={styles.switchSubtitle}>
                        Включи, если курьеру нужно забрать мусор прямо у двери.
                      </Text>
                    </View>

                    <Switch
                        value={leaveAtDoor}
                        onValueChange={setLeaveAtDoor}
                        disabled={loading}
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
                        thumbColor={Platform.OS === "android" ? colors.white : undefined}
                        ios_backgroundColor={colors.border}
                    />
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
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
                        thumbColor={Platform.OS === "android" ? colors.white : undefined}
                        ios_backgroundColor={colors.border}
                    />
                  </View>
                </AppCard>
              </ScreenSection>

              <ScreenSection title="Оплата">
                <AppCard>
                  <Text style={styles.label}>Способ оплаты</Text>
                  <View style={styles.paymentMethodCard}>
                    <Text style={styles.paymentMethodTitle}>
                      {getPaymentMethodLabel(paymentMethod)}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Способ оплаты можно изменить в профиле.
                    </Text>
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

                  <TextInput
                      value={String(tip)}
                      onChangeText={handleManualTipChange}
                      placeholder="Введите сумму"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      editable={!loading}
                      style={styles.manualTipInput}
                  />

                  <View style={styles.paymentSummaryBox}>
                    <InfoRow
                        label="Метод оплаты"
                        value={getPaymentMethodLabel(paymentMethod)}
                        styles={styles}
                    />
                    <View style={styles.summaryDivider} />
                    <InfoRow label="Чаевые" value={`${tip} ₽`} styles={styles} />
                    <View style={styles.summaryDivider} />
                    <InfoRow
                        label="Итого"
                        value={`${totalPreview} ₽`}
                        strong
                        styles={styles}
                    />
                  </View>
                </AppCard>
              </ScreenSection>

            </ScrollView>

            <View style={styles.footer}>
              <AppButton
                  title="Перейти к выбору адреса"
                  onPress={handleOpenMap}
                  disabled={loading}
              />
              <AppButton
                  title="Назад"
                  variant="secondary"
                  onPress={() => router.back()}
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

function InfoRow({
                   label,
                   value,
                   strong = false,
                   styles,
                 }: InfoRowProps & { styles: ReturnType<typeof createStyles> }) {
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

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
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
      color: colors.errorText,
    },
    formGroup: {
      marginBottom: spacing.xs,
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
    phoneInputBox: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    phoneInputBoxFocused: {
      borderColor: colors.primary,
    },
    phoneInputText: {
      fontSize: typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: colors.text,
      textAlign: "left",
    },
    phoneInputPlaceholder: {
      color: colors.textMuted,
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
    manualTipInput: {
      minHeight: 52,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    paymentMethodCard: {
      borderRadius: radii.lg,
      backgroundColor: colors.primarySoft,
      padding: spacing.md,
      gap: spacing.xs,
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
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: spacing.sm,
    },
  });
}
