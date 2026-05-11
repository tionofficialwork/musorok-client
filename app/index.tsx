import { useMemo } from "react";
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import AppButton from "../components/ui/AppButton";
import AppCard from "../components/ui/AppCard";
import AppLogo from "../components/ui/AppLogo";
import { spacing, typography } from "../lib/theme";
import { useAppTheme } from "../providers/AppThemeProvider";

type HomeIconVariant = "order" | "active" | "history" | "profile";

const HOME_ICON_SOURCES: Record<HomeIconVariant, ImageSourcePropType> = {
  order: require("../assets/menu-icons/order.png"),
  active: require("../assets/menu-icons/active.png"),
  history: require("../assets/menu-icons/history.png"),
  profile: require("../assets/menu-icons/profile.png"),
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Главная", headerShadowVisible: false }} />

        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <AppLogo size="md" />
          </View>

          <View style={styles.actions}>
            <AppCard>
              <HomeIcon variant="order" styles={styles} />
              <Text style={styles.actionTitle}>Новый заказ</Text>
              <Text style={styles.actionText}>
                Оформить вынос мусора прямо сейчас
              </Text>
              <View style={styles.actionButtonWrap}>
                <AppButton
                    title="Открыть"
                    onPress={() => router.push("/order/package")}
                />
              </View>
            </AppCard>

            <AppCard>
              <HomeIcon variant="active" styles={styles} />
              <Text style={styles.actionTitle}>Активный заказ</Text>
              <Text style={styles.actionText}>
                Проверить текущий статус и детали заказа
              </Text>
              <View style={styles.actionButtonWrap}>
                <AppButton
                    title="Открыть"
                    onPress={() => router.push("/order/active")}
                    variant="secondary"
                />
              </View>
            </AppCard>

            <AppCard>
              <HomeIcon variant="history" styles={styles} />
              <Text style={styles.actionTitle}>История</Text>
              <Text style={styles.actionText}>
                Посмотреть завершённые и прошлые заказы
              </Text>
              <View style={styles.actionButtonWrap}>
                <AppButton
                    title="Открыть"
                    onPress={() => router.push("/order/history")}
                    variant="secondary"
                />
              </View>
            </AppCard>

            <AppCard>
              <HomeIcon variant="profile" styles={styles} />
              <Text style={styles.actionTitle}>Профиль</Text>
              <Text style={styles.actionText}>
                Адреса, оплата и настройки приложения
              </Text>
              <View style={styles.actionButtonWrap}>
                <AppButton
                    title="Открыть"
                    onPress={() => router.push("/profile")}
                    variant="secondary"
                />
              </View>
            </AppCard>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

function HomeIcon({
  variant,
  styles,
}: {
  variant: HomeIconVariant;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.iconBadge}>
      <Image
        source={HOME_ICON_SOURCES[variant]}
        style={styles.menuIcon}
        resizeMode="contain"
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    logoWrap: {
      alignItems: "center",
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    actions: {
      gap: spacing.md,
    },
    iconBadge: {
      width: 86,
      height: 86,
      borderRadius: 28,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    menuIcon: {
      width: 74,
      height: 74,
    },
    actionTitle: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    actionText: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    actionButtonWrap: {
      marginTop: spacing.md,
    },
  });
}
