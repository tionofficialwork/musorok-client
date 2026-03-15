import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import ScreenSection from "../../components/ui/ScreenSection";
import { colors, radii, spacing, typography } from "../../lib/theme";

type SuccessParams = {
  orderId?: string;
};

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<SuccessParams>();

  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const handleOpenActiveOrder = () => {
    if (!orderId) {
      router.replace("/");
      return;
    }

    router.replace({
      pathname: "/order/active",
      params: {
        orderId,
      },
    });
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleOpenHistory = () => {
    router.replace("/order/history");
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Заказ создан",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <AppScreen>
        <View style={styles.container}>
          <ScreenSection style={styles.section}>
            <View style={styles.heroBlock}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>✓</Text>
              </View>

              <Text style={styles.title}>Заказ успешно создан</Text>
              <Text style={styles.subtitle}>
                Мы сохранили заказ в системе. Теперь его можно отслеживать на
                экране активного заказа.
              </Text>
            </View>

            <AppCard style={styles.infoCard}>
              <Text style={styles.infoTitle}>Что дальше</Text>

              <View style={styles.steps}>
                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Заказ уже доступен в системе и появится у курьера.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    Статус заказа можно смотреть на экране активного заказа.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>
                    После завершения заказ попадёт в историю.
                  </Text>
                </View>
              </View>

              {orderId ? (
                <View style={styles.orderIdBox}>
                  <Text style={styles.orderIdLabel}>ID заказа</Text>
                  <Text style={styles.orderIdValue}>{orderId}</Text>
                </View>
              ) : null}
            </AppCard>

            <View style={styles.buttons}>
              <AppButton
                title="Открыть активный заказ"
                onPress={handleOpenActiveOrder}
              />
              <AppButton
                title="На главную"
                variant="outline"
                onPress={handleGoHome}
              />
              <AppButton
                title="История заказов"
                variant="outline"
                onPress={handleOpenHistory}
              />
            </View>
          </ScreenSection>
        </View>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  section: {
    flex: 1,
    justifyContent: "center",
  },
  heroBlock: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.primary,
    marginTop: -2,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  infoCard: {
    gap: spacing.lg,
  },
  infoTitle: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
  },
  steps: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  stepText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  orderIdBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  orderIdLabel: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  orderIdValue: {
    fontSize: typography.body,
    fontWeight: "800",
    color: colors.text,
  },
  buttons: {
    gap: spacing.md,
  },
});