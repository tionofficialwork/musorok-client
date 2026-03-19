import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";

export default function ProfilePaymentsScreen() {
  const router = useRouter();

  const handleSoon = (title: string) => {
    Alert.alert("Следующий этап", `${title} подключим на следующем шаге roadmap.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Оплата",
          headerShadowVisible: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Профиль</Text>
            <Text style={styles.title}>Способы оплаты</Text>
            <Text style={styles.description}>
              Здесь позже появятся банковские карты, оплата одним тапом и выбор
              способа оплаты по умолчанию.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Основной способ оплаты</Text>

            <View style={styles.paymentRow}>
              <View style={styles.paymentIconWrap}>
                <Text style={styles.paymentIcon}>💵</Text>
              </View>

              <View style={styles.paymentTextWrap}>
                <Text style={styles.paymentTitle}>Наличными курьеру</Text>
                <Text style={styles.paymentSubtitle}>
                  Самый простой MVP-вариант до подключения онлайн-платежей
                </Text>
              </View>

              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Активно</Text>
              </View>
            </View>

            <View style={styles.paymentRowMuted}>
              <View style={styles.paymentIconWrapMuted}>
                <Text style={styles.paymentIcon}>💳</Text>
              </View>

              <View style={styles.paymentTextWrap}>
                <Text style={styles.paymentTitle}>Банковская карта</Text>
                <Text style={styles.paymentSubtitle}>
                  Подключим после подготовки payment flow
                </Text>
              </View>
            </View>

            <View style={styles.paymentRowMuted}>
              <View style={styles.paymentIconWrapMuted}>
                <Text style={styles.paymentIcon}></Text>
              </View>

              <View style={styles.paymentTextWrap}>
                <Text style={styles.paymentTitle}>Apple Pay / Google Pay</Text>
                <Text style={styles.paymentSubtitle}>
                  Будет доступно после интеграции онлайн-оплаты
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Оплата без подтверждения</Text>
                <Text style={styles.switchSubtitle}>
                  В будущем позволит быстрее завершать повторные заказы
                </Text>
              </View>

              <Switch value={false} disabled />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Что дальше</Text>
            <Text style={styles.infoText}>
              Следующим шагом можно сделать сохранение payment preferences в
              Supabase, а затем подготовить integration layer под реальные
              платежи.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => handleSoon("Добавление карты")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Добавить карту</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const colors = {
  background: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#E7ECF3",
  text: "#16181D",
  textSecondary: "#667085",
  primary: "#E9281D",
  primarySoft: "#FFF1F0",
  muted: "#F8FAFC",
};

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
    padding: 16,
    paddingBottom: 160,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
  },
  paymentRowMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.muted,
    marginBottom: 12,
  },
  paymentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFD9D6",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconWrapMuted: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIcon: {
    fontSize: 22,
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  selectedBadge: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
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
    paddingBottom: 18,
    gap: 10,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.92,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
});