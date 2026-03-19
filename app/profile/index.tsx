import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getOwnerKey } from "../../lib/profileOwner";

type ActionItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  href?: "/profile/account" | "/profile/addresses" | "/profile/payments";
};

type ProfileSummary = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

export default function ProfileScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const handleSoon = (title: string) => {
    Alert.alert("Скоро будет", `${title} подключим дальше по roadmap`);
  };

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);

      const ownerKey = await getOwnerKey();

      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, phone")
        .eq("owner_key", ownerKey)
        .maybeSingle();

      setSummary(
        data
          ? {
              first_name: data.first_name ?? null,
              last_name: data.last_name ?? null,
              phone: data.phone ?? null,
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
      id: "account",
      title: "Мой аккаунт",
      subtitle: "Имя, телефон и базовые данные профиля",
      emoji: "👤",
      href: "/profile/account",
    },
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
      id: "support",
      title: "Поддержка",
      subtitle: "Помощь и обратная связь",
      emoji: "💬",
    },
  ];

  const futureItems: ActionItem[] = [
    {
      id: "notifications",
      title: "Уведомления",
      subtitle: "Push и напоминания",
      emoji: "🔔",
    },
    {
      id: "favorites",
      title: "Избранное",
      subtitle: "Быстрые сценарии",
      emoji: "⭐",
    },
    {
      id: "subscription",
      title: "Подписка",
      subtitle: "Регулярный вынос мусора",
      emoji: "♻️",
    },
  ];

  const handleItemPress = (item: ActionItem) => {
    if (item.href) {
      router.push(item.href);
      return;
    }

    handleSoon(item.title);
  };

  const fullName = [summary?.first_name, summary?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Профиль", headerShadowVisible: false }} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {summary?.first_name?.trim()?.[0]?.toUpperCase() ?? "М"}
            </Text>
          </View>

          <Text style={styles.title}>Ваш профиль</Text>
          <Text style={styles.subtitle}>
            Здесь находятся ваши данные, адреса и настройки сервиса
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Аккаунт</Text>

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
              Профиль ещё не заполнен. Открой экран аккаунта и сохрани данные.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Основное</Text>

          {mainItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>

              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Скоро</Text>

          {futureItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleItemPress(item)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>

              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const colors = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  border: "#E7ECF3",
  text: "#16181D",
  sub: "#667085",
  primary: "#E9281D",
  primarySoft: "#FFF1F0",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FFE5E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    fontSize: 14,
    color: colors.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.sub,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  summaryPhone: {
    fontSize: 14,
    color: colors.sub,
  },
  summaryMuted: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.sub,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    color: colors.text,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.sub,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    color: "#B0B8C5",
  },
});