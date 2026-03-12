import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const handleStartOrder = () => {
    router.push("/order/package");
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.badge}>Клиентское приложение</Text>
        <Text style={styles.title}>МусорОК</Text>
        <Text style={styles.subtitle}>
          Закажите вынос мусора в пару нажатий — без звонков и сложных действий.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Что уже готово</Text>
        <Text style={styles.cardText}>• Expo Router подключен</Text>
        <Text style={styles.cardText}>• Foundation приложения готов</Text>
        <Text style={styles.cardText}>• Начинаем собирать order flow</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleStartOrder}>
        <Text style={styles.primaryButtonText}>Начать заказ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0f10",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  hero: {
    marginBottom: 28,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(134, 239, 172, 0.12)",
    color: "#86efac",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  title: {
    marginTop: 16,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#9ca3af",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#17181a",
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#d1d5db",
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#2c3807",
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
});