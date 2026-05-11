import {
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  radii,
  spacing,
  typography,
} from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type PackageOption = {
  id: string;
  size: string;
  name: string;
  price: number;
  subtitle: string;
  eta: string;
  badge?: string;
  features: string[];
};

const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: "s",
    size: "S",
    name: "Маленький пакет",
    price: 139,
    subtitle: "Подойдет для 1–2 небольших пакетов бытового мусора",
    eta: "Обычно 10–20 мин",
    badge: "Быстро",
    features: [
      "Для ежедневного бытового мусора",
      "Удобно для квартиры",
      "Хороший вариант для тестового заказа",
    ],
  },
  {
    id: "m",
    size: "M",
    name: "Средний пакет",
    price: 189,
    subtitle: "Оптимально для семьи или накопившегося мусора за несколько дней",
    eta: "Обычно 10–25 мин",
    badge: "Популярно",
    features: [
      "Лучший баланс цены и объема",
      "Подходит для регулярных заказов",
      "Чаще всего выбирают пользователи",
    ],
  },
  {
    id: "l",
    size: "L",
    name: "Большой пакет",
    price: 249,
    subtitle: "Когда мусора много или нужно вынести сразу несколько пакетов",
    eta: "Обычно 15–30 мин",
    badge: "Выгодно",
    features: [
      "Для большого объема",
      "Удобно после уборки",
      "Подойдет перед приездом гостей или после мероприятий",
    ],
  },
];

export default function OrderPackageScreen() {
  const router = useRouter();
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPackageId, setSelectedPackageId] = useState<string>(
      PACKAGE_OPTIONS[1]?.id ?? PACKAGE_OPTIONS[0].id
  );

  const selectedPackage = useMemo(() => {
    return (
        PACKAGE_OPTIONS.find((item) => item.id === selectedPackageId) ??
        PACKAGE_OPTIONS[0]
    );
  }, [selectedPackageId]);

  const handleContinue = () => {
    router.push({
      pathname: "/order/details",
      params: {
        packageId: selectedPackage.id,
        packageName: `${selectedPackage.size} · ${selectedPackage.name}`,
        price: String(selectedPackage.price),
      },
    });
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
            options={{
              title: "Выбор пакета",
              headerShadowVisible: false,
            }}
        />
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

        <View style={styles.container}>
          <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <Text style={styles.title}>Выберите подходящий пакет</Text>
              <Text style={styles.description}>
                Выберите объем заказа. На следующем экране вы укажете адрес,
                комментарий, телефон и способ оплаты.
              </Text>
            </View>

            <View style={styles.section}>
              {PACKAGE_OPTIONS.map((item) => {
                const isSelected = item.id === selectedPackageId;

                return (
                    <Pressable
                        key={item.id}
                        onPress={() => setSelectedPackageId(item.id)}
                        style={({ pressed }) => [
                          styles.packageCard,
                          isSelected && styles.packageCardSelected,
                          pressed && styles.packageCardPressed,
                        ]}
                    >
                      <View style={styles.packageTopRow}>
                        <View style={styles.packageTitleBlock}>
                          <View style={styles.packageTitleRow}>
                            <View
                                style={[
                                  styles.sizeBadge,
                                  isSelected && styles.sizeBadgeSelected,
                                ]}
                            >
                              <Text
                                  style={[
                                    styles.sizeBadgeText,
                                    isSelected && styles.sizeBadgeTextSelected,
                                  ]}
                              >
                                {item.size}
                              </Text>
                            </View>

                            <Text
                                style={[
                                  styles.packageName,
                                  isSelected && styles.packageNameSelected,
                                ]}
                            >
                              {item.name}
                            </Text>

                            {item.badge ? (
                                <View
                                    style={[
                                      styles.badge,
                                      isSelected && styles.badgeSelected,
                                    ]}
                                >
                                  <Text
                                      style={[
                                        styles.badgeText,
                                        isSelected && styles.badgeTextSelected,
                                      ]}
                                  >
                                    {item.badge}
                                  </Text>
                                </View>
                            ) : null}
                          </View>

                          <Text
                              style={[
                                styles.packageSubtitle,
                                isSelected && styles.packageSubtitleSelected,
                              ]}
                          >
                            {item.subtitle}
                          </Text>
                        </View>

                        <View
                            style={[
                              styles.radioOuter,
                              isSelected && styles.radioOuterSelected,
                            ]}
                        >
                          {isSelected ? <View style={styles.radioInner} /> : null}
                        </View>
                      </View>

                      <View style={styles.packageMetaRow}>
                        <View
                            style={[
                              styles.metaPill,
                              isSelected && styles.metaPillSelected,
                            ]}
                        >
                          <Text
                              style={[
                                styles.metaPillText,
                                isSelected && styles.metaPillTextSelected,
                              ]}
                          >
                            {item.eta}
                          </Text>
                        </View>

                        <Text
                            style={[
                              styles.price,
                              isSelected && styles.priceSelected,
                            ]}
                        >
                          {item.price} ₽
                        </Text>
                      </View>

                      <View style={styles.featuresList}>
                        {item.features.map((feature) => (
                            <View key={feature} style={styles.featureRow}>
                              <View
                                  style={[
                                    styles.featureDot,
                                    isSelected && styles.featureDotSelected,
                                  ]}
                              />
                              <Text
                                  style={[
                                    styles.featureText,
                                    isSelected && styles.featureTextSelected,
                                  ]}
                              >
                                {feature}
                              </Text>
                            </View>
                        ))}
                      </View>
                    </Pressable>
                );
              })}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Что важно знать</Text>

              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  Курьер заберет только бытовой мусор.
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  Точный адрес и детали вы заполните на следующем шаге.
                </Text>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  Итоговая сумма будет видна перед оплатой.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <View style={styles.bottomSummary}>
              <Text style={styles.bottomLabel}>Вы выбрали</Text>
              <Text style={styles.bottomValue}>
                {selectedPackage.name} · {selectedPackage.price} ₽
              </Text>
            </View>

            <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && styles.continueButtonPressed,
                ]}
            >
              <Text style={styles.continueButtonText}>Продолжить</Text>
            </Pressable>

            <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
            >
              <Text style={styles.backButtonText}>Назад</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 240,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    section: {
      gap: 12,
      marginBottom: 8,
    },
    packageCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    packageCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    packageCardPressed: {
      opacity: 0.94,
    },
    packageTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    packageTitleBlock: {
      flex: 1,
    },
    packageTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    packageName: {
      fontSize: 19,
      fontWeight: "800",
      color: colors.text,
    },
    packageNameSelected: {
      color: colors.text,
    },
    sizeBadge: {
      minWidth: 46,
      minHeight: 34,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    sizeBadgeSelected: {
      backgroundColor: colors.primary,
    },
    sizeBadgeText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.primary,
    },
    sizeBadgeTextSelected: {
      color: colors.white,
    },
    badge: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    badgeSelected: {
      backgroundColor: colors.primarySoft,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    badgeTextSelected: {
      color: colors.primary,
    },
    packageSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    packageSubtitleSelected: {
      color: colors.text,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      marginTop: 2,
    },
    radioOuterSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    packageMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 12,
    },
    metaPill: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    metaPillSelected: {
      backgroundColor: colors.primarySoft,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.success,
    },
    metaPillTextSelected: {
      color: colors.primary,
    },
    price: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    priceSelected: {
      color: colors.primary,
    },
    featuresList: {
      gap: 10,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    featureDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    featureDotSelected: {
      backgroundColor: colors.primary,
    },
    featureText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    featureTextSelected: {
      color: colors.text,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 14,
    },
    infoItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 10,
    },
    infoDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 6,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 30,
      gap: 10,
    },
    bottomSummary: {
      marginBottom: 12,
    },
    bottomLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    bottomValue: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    continueButton: {
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    continueButtonPressed: {
      opacity: 0.9,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.white,
    },
    backButton: {
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    backButtonPressed: {
      opacity: 0.92,
    },
    backButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.primary,
    },
  });
}
