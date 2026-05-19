import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { api } from "../../lib/api";
import {
  radii,
  shadows,
  spacing,
  typography,
  type ThemeMode,
} from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type ActionItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  href?:
    | "/profile/account"
    | "/profile/addresses"
    | "/profile/payments"
    | "/profile/notifications";
};

type ProfileSummary = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type ThemeOption = {
  id: ThemeMode;
  title: string;
  subtitle: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "system",
    title: "Системная",
    subtitle: "Автоматически повторяет тему устройства",
  },
  {
    id: "light",
    title: "Светлая",
    subtitle: "Всегда использовать светлую тему",
  },
  {
    id: "dark",
    title: "Тёмная",
    subtitle: "Всегда использовать тёмную тему",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, themeMode, resolvedTheme, setThemeMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);

      const { profile } = await api.profile.get();

      setSummary(
          profile
              ? {
                first_name: profile.first_name ?? null,
                last_name: profile.last_name ?? null,
                phone: profile.phone ?? null,
              }
              : null
      );
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadSummary();
      }, [loadSummary])
  );

  const mainItems: ActionItem[] = [
    {
      id: "addresses",
      title: "Мои адреса",
      subtitle: "Сохраненные адреса для быстрого заказа",
      emoji: "📍",
      href: "/profile/addresses",
    },
    {
      id: "payments",
      title: "Оплата",
      subtitle: "Карты и способы оплаты",
      emoji: "💳",
      href: "/profile/payments",
    },
    {
      id: "notifications",
      title: "Уведомления",
      subtitle: "Push и напоминания",
      emoji: "🔔",
      href: "/profile/notifications",
    },
  ];

  const handleItemPress = (item: ActionItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  const fullName = [summary?.first_name, summary?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

  const resolvedThemeLabel =
      resolvedTheme === "dark" ? "Тёмная тема активна" : "Светлая тема активна";
  const selectedThemeOption =
      THEME_OPTIONS.find((option) => option.id === themeMode) ?? THEME_OPTIONS[0];

  const handleThemeSelect = async (mode: ThemeMode) => {
    setIsThemeDropdownOpen(false);
    await setThemeMode(mode);
  };

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Профиль", headerShadowVisible: false }} />

        <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
          <AppCard style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {summary?.first_name?.trim()?.[0]?.toUpperCase() ?? "М"}
              </Text>
            </View>

            <Text style={styles.title}>Профиль</Text>
            <Text style={styles.subtitle}>
              Здесь находятся ваши данные, адреса и настройки сервиса
            </Text>

            {isLoadingSummary ? (
                <View style={styles.summaryLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.summaryMuted}>Загружаем данные профиля...</Text>
                </View>
            ) : summary ? (
                <>
                  <Text style={styles.summaryName}>
                    {fullName || "Имя пока не заполнено"}
                  </Text>
                  <Text style={styles.summaryPhone}>
                    {summary.phone || "Телефон пока не заполнен"}
                  </Text>
                </>
            ) : (
                <Text style={styles.summaryMuted}>
                  Профиль ещё не заполнен. Добавьте имя и телефон для заказов.
                </Text>
            )}

            <View style={styles.profileAction}>
              <AppButton
                  title="Редактировать данные"
                  variant="secondary"
                  onPress={() => router.push("/profile/account")}
              />
            </View>
          </AppCard>

          <ScreenSection title="Основное">
            {mainItems.map((item) => (
                <Pressable
                    key={item.id}
                    onPress={() => handleItemPress(item)}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>

                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </Pressable>
            ))}
          </ScreenSection>

          <ScreenSection title="Настройки">
            <AppCard style={styles.themeCard}>
              <Text style={styles.themeCardTitle}>Тема приложения</Text>
              <Text style={styles.themeCardSubtitle}>
                {themeMode === "system"
                    ? `Сейчас используется системный режим. ${resolvedThemeLabel}.`
                    : "Выбран ручной режим отображения приложения."}
              </Text>

              <Pressable
                  onPress={() => setIsThemeDropdownOpen((current) => !current)}
                  style={({ pressed }) => [
                    styles.themeSelect,
                    isThemeDropdownOpen ? styles.themeSelectOpen : undefined,
                    pressed ? styles.themeSelectPressed : undefined,
                  ]}
              >
                <View style={styles.themeSelectCopy}>
                  <Text style={styles.themeSelectLabel}>Выбранная тема</Text>
                  <Text style={styles.themeSelectTitle}>
                    {selectedThemeOption.title}
                  </Text>
                  <Text style={styles.themeSelectSubtitle}>
                    {selectedThemeOption.subtitle}
                  </Text>
                </View>

                <Text style={styles.themeSelectChevron}>
                  {isThemeDropdownOpen ? "⌃" : "⌄"}
                </Text>
              </Pressable>

              {isThemeDropdownOpen ? (
                  <View style={styles.themeDropdown}>
                    {THEME_OPTIONS.map((option, index) => {
                      const isSelected = themeMode === option.id;

                      return (
                          <Pressable
                              key={option.id}
                              onPress={() => handleThemeSelect(option.id)}
                              style={({ pressed }) => [
                                styles.themeDropdownItem,
                                index === THEME_OPTIONS.length - 1
                                    ? styles.themeDropdownItemLast
                                    : undefined,
                                isSelected ? styles.themeDropdownItemSelected : undefined,
                                pressed ? styles.themeSelectPressed : undefined,
                              ]}
                          >
                            <View style={styles.themeOptionTextWrap}>
                              <Text
                                  style={[
                                    styles.themeOptionTitle,
                                    isSelected
                                        ? styles.themeOptionTitleSelected
                                        : undefined,
                                  ]}
                              >
                                {option.title}
                              </Text>

                              <Text
                                  style={[
                                    styles.themeOptionSubtitle,
                                    isSelected
                                        ? styles.themeOptionSubtitleSelected
                                        : undefined,
                                  ]}
                              >
                                {option.subtitle}
                              </Text>
                            </View>

                            <Text
                                style={[
                                  styles.themeCheck,
                                  isSelected ? styles.themeCheckSelected : undefined,
                                ]}
                            >
                              ✓
                            </Text>
                          </Pressable>
                      );
                    })}
                  </View>
              ) : null}
            </AppCard>
          </ScreenSection>

          <View style={styles.homeAction}>
            <AppButton
                title="В главное меню"
                variant="secondary"
                onPress={() => router.replace("/")}
            />
          </View>
        </ScrollView>
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
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    hero: {
      alignItems: "center",
      marginBottom: spacing.lg,
      ...shadows.card,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    summaryLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    summaryName: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    summaryPhone: {
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
    },
    summaryMuted: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: "center",
    },
    profileAction: {
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
    themeCard: {
      ...shadows.card,
    },
    themeCardTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    themeCardSubtitle: {
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    themeSelect: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    themeSelectOpen: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    themeSelectPressed: {
      opacity: 0.92,
    },
    themeSelectCopy: {
      flex: 1,
      gap: 3,
    },
    themeSelectLabel: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
    },
    themeSelectTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.text,
    },
    themeSelectSubtitle: {
      fontSize: typography.caption,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    themeSelectChevron: {
      width: 30,
      fontSize: 24,
      lineHeight: 26,
      color: colors.text,
      textAlign: "center",
    },
    themeDropdown: {
      overflow: "hidden",
      marginTop: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },
    themeDropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    themeDropdownItemLast: {
      borderBottomWidth: 0,
    },
    themeDropdownItemSelected: {
      backgroundColor: colors.primarySoft,
    },
    themeOptionTextWrap: {
      flex: 1,
      gap: 2,
    },
    themeOptionTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    themeOptionTitleSelected: {
      color: colors.primary,
    },
    themeOptionSubtitle: {
      fontSize: typography.caption,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    themeOptionSubtitleSelected: {
      color: colors.text,
    },
    themeCheck: {
      width: 24,
      fontSize: typography.body,
      fontWeight: "800",
      color: "transparent",
      textAlign: "center",
    },
    themeCheckSelected: {
      color: colors.primary,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      ...shadows.card,
    },
    cardPressed: {
      opacity: 0.9,
    },
    emoji: {
      fontSize: 22,
      marginRight: 12,
    },
    cardTextWrap: {
      flex: 1,
      paddingRight: 8,
    },
    cardTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    chevron: {
      fontSize: 22,
      color: colors.textSecondary,
    },
    lastSection: {
      marginBottom: 0,
    },
    homeAction: {
      marginTop: spacing.sm,
    },
  });
}
