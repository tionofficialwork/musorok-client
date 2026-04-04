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
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { getPaymentPreferences } from "../../lib/paymentPreferences";
import { getProfileOwnerKey } from "../../lib/profileIdentity";
import { supabase } from "../../lib/supabase";
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

type PaymentMethod = "card";

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
    case "s":
      return "Маленький пакет";
    case "m":
      return "Средний пакет";
    case "l":
      return "Большой пакет";
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
      return 199;
    case "m":
      return 299;
    case "l":
      return 449;
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

function buildAddressDetailsPreview(params: {
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
}) {
  const items = [
    params.apartment ? `кв. ${params.apartment}` : "",
    params.entrance ? `подъезд ${params.entrance}` : "",
    params.floor ? `этаж ${params.floor}` : "",
    params.intercom ? `домофон ${params.intercom}` : "",
  ].filter(Boolean);

  return items.join(", ");
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
      typeof params.address === "string" ? params.address : "";
  const selectedApartment =
      typeof params.apartment === "string" ? params.apartment : "";
  const selectedEntrance =
      typeof params.entrance === "string" ? params.entrance : "";
  const selectedFloor = typeof params.floor === "string" ? params.floor : "";
  const selectedIntercom =
      typeof params.intercom === "string" ? params.intercom : "";
  const selectedAddressLabel =
      typeof params.addressLabel === "string" ? params.addressLabel : "";
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
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
          supabase.from("user_addresses").select("*").eq("owner_key", ownerKey).limit(10),
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
        const selectedSavedAddress = selectBestAddress(addressRows);
        const selectedSavedAddressValue = getAddressValue(selectedSavedAddress);

        const nextPrefill: PrefillState = {
          address: selectedSavedAddressValue,
          phone:
              typeof profileRow?.phone === "string" ? profileRow.phone.trim() : "",
          shouldCall: profileRow?.call_allowed === true,
          paymentMethod: "card",
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

        setPaymentMethod("card");

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

  const normalizedPhone = useMemo(() => normalizeOrderPhoneInput(phone), [phone]);

  const addressDetailsPreview = useMemo(() => {
    return buildAddressDetailsPreview({
      apartment: selectedApartment,
      entrance: selectedEntrance,
      floor: selectedFloor,
      intercom: selectedIntercom,
    });
  }, [selectedApartment, selectedEntrance, selectedFloor, selectedIntercom]);

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

    if (!normalizedPhone.trim()) {
      Alert.alert("Ошибка", "Введите телефон");
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
                          <Text style={styles.prefillValue}>Карта</Text>
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
                    <View style={styles.inputLikeBox}>
                      <Text style={styles.inputLikeText}>
                        {phone || "Телефон пока не указан"}
                      </Text>
                    </View>
                    <Text style={styles.helperText}>
                      В заказ уйдёт:{" "}
                      {normalizedPhone
                          ? formatPhonePreview(normalizedPhone)
                          : "номер не указан"}
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

              <ScreenSection
                  title="Оплата"
                  subtitle="Оплата заказа доступна только картой"
              >
                <AppCard>
                  <Text style={styles.label}>Способ оплаты</Text>
                  <View style={styles.paymentMethodCard}>
                    <Text style={styles.paymentMethodTitle}>Карта</Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Это единственный доступный способ оплаты для новых заказов.
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

                  <View style={styles.paymentSummaryBox}>
                    <InfoRow label="Метод оплаты" value="Карта" styles={styles} />
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

              <ScreenSection
                  title="Адрес"
                  subtitle="Адрес теперь выбирается только через карту"
              >
                <AppCard>
                  {selectedAddress ? (
                      <View style={styles.addressSummary}>
                        <View style={styles.prefillRow}>
                          <Text style={styles.prefillLabel}>Точка на карте</Text>
                          <Text style={styles.prefillValue}>{selectedAddress}</Text>
                        </View>

                        {selectedAddressLabel ? (
                            <View style={styles.prefillRow}>
                              <Text style={styles.prefillLabel}>Название адреса</Text>
                              <Text style={styles.prefillValue}>{selectedAddressLabel}</Text>
                            </View>
                        ) : null}

                        {addressDetailsPreview ? (
                            <View style={styles.prefillRow}>
                              <Text style={styles.prefillLabel}>Детали адреса</Text>
                              <Text style={styles.prefillValue}>{addressDetailsPreview}</Text>
                            </View>
                        ) : null}

                        {selectedComment ? (
                            <View style={styles.prefillRow}>
                              <Text style={styles.prefillLabel}>Комментарий</Text>
                              <Text style={styles.prefillValue}>{selectedComment}</Text>
                            </View>
                        ) : null}
                      </View>
                  ) : (
                      <Text style={styles.prefillEmptyText}>
                        Адрес ещё не выбран. На следующем экране ты поставишь точку на
                        карте и сразу заполнишь квартиру, этаж, подъезд, домофон и
                        комментарий.
                      </Text>
                  )}

                  <View style={styles.addressButtonWrap}>
                    <AppButton
                        title={selectedAddress ? "Изменить адрес на карте" : "Выбрать адрес на карте"}
                        onPress={handleOpenMap}
                        disabled={loading}
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
                      <Text style={styles.stepTitle}>Откроется карта</Text>
                      <Text style={styles.stepText}>
                        Там ты выберешь точку и сразу заполнишь все детали адреса.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepDivider} />

                  <View style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Откроется подтверждение</Text>
                      <Text style={styles.stepText}>
                        После карты ты попадёшь на итоговый экран и подтвердишь создание заказа.
                      </Text>
                    </View>
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
    inputLikeBox: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    inputLikeText: {
      fontSize: typography.body,
      color: colors.text,
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
    addressSummary: {
      gap: spacing.sm,
    },
    addressButtonWrap: {
      marginTop: spacing.md,
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
}