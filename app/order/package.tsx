import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { colors, radii, shadows, spacing, typography } from "../../lib/theme";

type PackageOption = {
  id: string;
  label: string;
  price: number;
  description: string;
  eta: string;
  features: string[];
  recommended?: boolean;
};

const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: "small",
    label: "Малый пакет",
    price: 149,
    description: "Подойдёт для ежедневного бытового мусора из квартиры.",
    eta: "Вынос за 15–25 минут",
    features: [
      "1 стандартный пакет",
      "Подходит для одного-двух человек",
      "Быстрый вынос без лишних действий",
    ],
  },
  {
    id: "medium",
    label: "Стандарт",
    price: 249,
    description: "Оптимальный вариант для семьи и регулярного заказа.",
    eta: "Вынос за 15–30 минут",
    features: [
      "2–3 стандартных пакета",
      "Самый популярный вариант",
      "Удобно для регулярного использования",
    ],
    recommended: true,
  },
  {
    id: "large",
    label: "Большой пакет",
    price: 349,
    description: "Когда мусора накопилось больше обычного.",
    eta: "Вынос за 20–35 минут",
    features: [
      "4–5 пакетов или объёмный мусор",
      "Подходит после уборки",
      "Комфортный вариант без перегруза",
    ],
  },
];

export default function OrderPackageScreen() {
  const router = useRouter();

  const handleSelectPackage = (item: PackageOption) => {
    router.push({
      pathname: "/order/details",
      params: {
        packageId: item.id,
        packageName: item.label,
        price: String(item.price),
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: "Выбор пакета" }} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Оформление заказа</Text>
            <Text style={styles.title}>Выберите объём мусора</Text>
            <Text style={styles.subtitle}>
              Сначала выберите подходящий пакет. На следующем шаге укажем детали
              заказа и способ оплаты.
            </Text>
          </View>

          <ScreenSection
            title="Доступные варианты"
            subtitle="Все тарифы уже включают вынос бытового мусора курьером."
          >
            <View style={styles.cards}>
              {PACKAGE_OPTIONS.map((item) => (
                <AppCard key={item.id}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleBlock}>
                      <View style={styles.labelRow}>
                        <Text style={styles.cardTitle}>{item.label}</Text>

                        {item.recommended ? (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>Хит</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.cardDescription}>{item.description}</Text>
                    </View>

                    <View style={styles.priceBlock}>
                      <Text style={styles.priceValue}>{item.price} ₽</Text>
                      <Text style={styles.priceCaption}>фиксированно</Text>
                    </View>
                  </View>

                  <View style={styles.metaBox}>
                    <Text style={styles.metaTitle}>{item.eta}</Text>
                    <Text style={styles.metaSubtitle}>
                      Точное время зависит от загруженности курьеров поблизости.
                    </Text>
                  </View>

                  <View style={styles.featuresList}>
                    {item.features.map((feature) => (
                      <View key={feature} style={styles.featureRow}>
                        <View style={styles.featureDot} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <AppButton
                    title="Выбрать"
                    onPress={() => handleSelectPackage(item)}
                  />
                </AppCard>
              ))}
            </View>
          </ScreenSection>

          <ScreenSection
            title="Как это работает"
            subtitle="Коротко про сценарий заказа"
          >
            <AppCard>
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Выбираете пакет</Text>
                  <Text style={styles.stepText}>
                    Подбираете объём под ваш текущий заказ.
                  </Text>
                </View>
              </View>

              <View style={styles.stepDivider} />

              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Заполняете детали</Text>
                  <Text style={styles.stepText}>
                    Адрес, квартира, комментарий, звонок и другие параметры.
                  </Text>
                </View>
              </View>

              <View style={styles.stepDivider} />

              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Подтверждаете заказ</Text>
                  <Text style={styles.stepText}>
                    После подтверждения заказ уходит в Supabase и становится активным.
                  </Text>
                </View>
              </View>
            </AppCard>
          </ScreenSection>
        </ScrollView>
      </SafeAreaView>
    </>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
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
  cards: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  recommendedBadgeText: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  cardDescription: {
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.textMuted,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: typography.h2,
    fontWeight: "800",
    color: colors.text,
  },
  priceCaption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  metaBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  metaTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  metaSubtitle: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: colors.textMuted,
  },
  featuresList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 21,
    color: colors.text,
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
    ...shadows.sm,
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
});