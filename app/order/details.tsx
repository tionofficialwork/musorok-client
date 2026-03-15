import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppInput from "../../components/ui/AppInput";
import AppScreen from "../../components/ui/AppScreen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ScreenSection from "../../components/ui/ScreenSection";
import SectionTitle from "../../components/ui/SectionTitle";
import { colors, radii, spacing, typography } from "../../lib/theme";

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    packageId?: string;
    packageName?: string;
    price?: string;
    address?: string;
    apartment?: string;
    entrance?: string;
    comment?: string;
    leave_at_door?: string;
    call_required?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";

  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [comment, setComment] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [callRequired, setCallRequired] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    if (typeof params.address === "string") {
      setAddress(params.address);
    }

    if (typeof params.apartment === "string") {
      setApartment(params.apartment);
    }

    if (typeof params.entrance === "string") {
      setEntrance(params.entrance);
    }

    if (typeof params.comment === "string") {
      setComment(params.comment);
    }

    if (typeof params.leave_at_door === "string") {
      setLeaveAtDoor(params.leave_at_door === "true");
    }

    if (typeof params.call_required === "string") {
      setCallRequired(params.call_required === "true");
    }

    if (typeof params.latitude === "string") {
      setLatitude(params.latitude);
    }

    if (typeof params.longitude === "string") {
      setLongitude(params.longitude);
    }
  }, [
    params.address,
    params.apartment,
    params.call_required,
    params.comment,
    params.entrance,
    params.leave_at_door,
    params.latitude,
    params.longitude,
  ]);

  const isFormValid = useMemo(() => {
    return address.trim().length > 0;
  }, [address]);

  const hasMapPoint = Boolean(latitude && longitude);

  const handleOpenMap = () => {
    router.push({
      pathname: "/order/map",
      params: {
        packageId,
        packageName,
        price,
        address: address.trim(),
        apartment: apartment.trim(),
        entrance: entrance.trim(),
        comment: comment.trim(),
        leave_at_door: leaveAtDoor ? "true" : "false",
        call_required: callRequired ? "true" : "false",
        latitude,
        longitude,
      },
    });
  };

  const handleContinue = () => {
    if (!isFormValid) {
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
        leave_at_door: leaveAtDoor ? "true" : "false",
        call_required: callRequired ? "true" : "false",
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: "Детали заказа" }} />

      <AppScreen keyboardAvoiding>
        <ScreenSection>
          <ScreenHeader
            title="Укажи детали"
            subtitle="Заполни адрес и дополнительные параметры, чтобы курьер быстро нашёл тебя и забрал мусор без лишних звонков."
          />

          <AppCard>
            <SectionTitle>Адрес</SectionTitle>

            <View style={styles.formGroup}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Адрес *</Text>
                <AppInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Например: ул. Абая 21"
                  returnKeyType="next"
                />
              </View>

              <AppButton
                title={hasMapPoint ? "Изменить точку на карте" : "Выбрать на карте"}
                variant="outline"
                onPress={handleOpenMap}
              />

              {hasMapPoint ? (
                <Text style={styles.mapHint}>
                  Точка на карте выбрана и будет использована как основа адреса.
                </Text>
              ) : null}

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Квартира</Text>
                  <AppInput
                    value={apartment}
                    onChangeText={setApartment}
                    placeholder="12"
                    keyboardType="default"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.rowItem}>
                  <Text style={styles.label}>Подъезд</Text>
                  <AppInput
                    value={entrance}
                    onChangeText={setEntrance}
                    placeholder="2"
                    keyboardType="default"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Комментарий</Text>
                <AppInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Например: домофон не работает"
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
              </View>
            </View>
          </AppCard>

          <AppCard>
            <SectionTitle>Дополнительно</SectionTitle>

            <View style={styles.optionsList}>
              <OptionRow
                title="Оставить у двери"
                description="Подойдёт, если не хочешь лично передавать мусор."
                value={leaveAtDoor}
                onValueChange={setLeaveAtDoor}
              />

              <OptionRow
                title="Нужно позвонить"
                description="Курьер позвонит перед приходом."
                value={callRequired}
                onValueChange={setCallRequired}
              />
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.summaryTitle}>Текущий тариф</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName}>
                {packageName || "Тариф не выбран"}
              </Text>
              <Text style={styles.summaryPrice}>{price ? `${price} ₽` : "—"}</Text>
            </View>

            <View style={styles.summaryButtonWrap}>
              <AppButton
                title="Продолжить"
                onPress={handleContinue}
                disabled={!isFormValid}
              />
            </View>

            {!isFormValid ? (
              <Text style={styles.validationText}>
                Чтобы продолжить, укажи адрес.
              </Text>
            ) : null}
          </AppCard>
        </ScreenSection>
      </AppScreen>
    </>
  );
}

type OptionRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function OptionRow({
  title,
  description,
  value,
  onValueChange,
}: OptionRowProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
    >
      <View style={styles.optionTextBlock}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>

      <Switch value={value} onValueChange={onValueChange} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.text,
  },
  mapHint: {
    marginTop: -spacing.sm,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
    gap: spacing.sm,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
  },
  optionsList: {
    gap: spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  optionPressed: {
    opacity: 0.96,
  },
  optionTextBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.text,
  },
  optionDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  summaryTitle: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  summaryRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryName: {
    flex: 1,
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  summaryButtonWrap: {
    marginTop: spacing.lg,
  },
  validationText: {
    marginTop: spacing.sm,
    fontSize: typography.bodySmall,
    color: colors.errorText,
  },
});