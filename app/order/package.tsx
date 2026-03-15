import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ScreenSection from "../../components/ui/ScreenSection";
import SectionTitle from "../../components/ui/SectionTitle";
import { colors, radii, spacing, typography } from "../../lib/theme";

type PackageOption = {
  id: string;
  name: string;
  price: number;
  description: string;
};

const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: "small",
    name: "Маленький пакет",
    price: 199,
    description: "Подойдёт для небольшого объёма бытового мусора.",
  },
  {
    id: "standard",
    name: "Стандарт",
    price: 299,
    description: "Оптимальный вариант для большинства квартир.",
  },
  {
    id: "large",
    name: "Большой объём",
    price: 399,
    description: "Когда мусора больше обычного или пакетов несколько.",
  },
];

function formatPrice(price: number) {
  return `${price} ₽`;
}

export default function OrderPackageScreen() {
  const router = useRouter();
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    PACKAGE_OPTIONS[1]?.id ?? PACKAGE_OPTIONS[0].id
  );

  const selectedPackage = useMemo(
    () =>
      PACKAGE_OPTIONS.find((item) => item.id === selectedPackageId) ??
      PACKAGE_OPTIONS[0],
    [selectedPackageId]
  );

  const handleContinue = () => {
    router.push({
      pathname: "/order/details",
      params: {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: String(selectedPackage.price),
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: "Выбор тарифа" }} />

      <AppScreen>
        <ScreenSection>
          <ScreenHeader
            title="Выбери тариф"
            subtitle="Сначала выберем подходящий вариант, затем заполним детали заказа."
          />

          <View style={styles.cardsList}>
            {PACKAGE_OPTIONS.map((item) => {
              const isSelected = item.id === selectedPackageId;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedPackageId(item.id)}
                  style={({ pressed }) => [
                    styles.pressableCard,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <AppCard
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected,
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTextBlock}>
                        <Text style={styles.packageName}>{item.name}</Text>
                        <Text style={styles.packageDescription}>
                          {item.description}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radio,
                          isSelected && styles.radioSelected,
                        ]}
                      >
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                    </View>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Цена</Text>
                      <Text style={styles.priceValue}>
                        {formatPrice(item.price)}
                      </Text>
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </View>

          <AppCard>
            <SectionTitle>Выбранный тариф</SectionTitle>
            <Text style={styles.summaryName}>{selectedPackage.name}</Text>
            <Text style={styles.summaryDescription}>
              {selectedPackage.description}
            </Text>

            <View style={styles.summaryPriceRow}>
              <Text style={styles.summaryPriceLabel}>Итого</Text>
              <Text style={styles.summaryPriceValue}>
                {formatPrice(selectedPackage.price)}
              </Text>
            </View>

            <View style={styles.summaryButtonWrap}>
              <AppButton title="Продолжить" onPress={handleContinue} />
            </View>
          </AppCard>
        </ScreenSection>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  cardsList: {
    gap: spacing.md,
  },
  pressableCard: {
    borderRadius: radii.xl,
  },
  cardPressed: {
    opacity: 0.96,
  },
  packageCard: {
    borderWidth: 1,
    borderColor: "transparent",
    gap: spacing.md,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FFFDFC",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  packageName: {
    fontSize: typography.h2,
    fontWeight: "800",
    color: colors.text,
  },
  packageDescription: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: typography.bodySmall,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  summaryName: {
    fontSize: typography.h2,
    fontWeight: "800",
    color: colors.text,
  },
  summaryDescription: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  summaryPriceRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryPriceLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  summaryPriceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  summaryButtonWrap: {
    marginTop: spacing.lg,
  },
});