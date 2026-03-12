import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function OrderSuccessScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>✓</Text>
      </View>

      <Text style={styles.title}>Заказ создан</Text>
      <Text style={styles.subtitle}>
        Каркас flow работает. Следующим шагом подключим реальное создание заказа
        в Supabase и экран активного заказа.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.primaryButtonText}>На главный экран</Text>
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
    alignItems: "center",
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(134, 239, 172, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 36,
    fontWeight: "800",
    color: "#86efac",
  },
  title: {
    marginTop: 24,
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: "#9ca3af",
  },
  primaryButton: {
    marginTop: 28,
    width: "100%",
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