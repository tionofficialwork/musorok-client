import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>МусорОК</Text>
      <Text style={styles.subtitle}>
        Клиентское приложение сервиса выноса мусора
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Статус foundation</Text>
        <Text style={styles.cardRow}>
          Expo Router: <Text style={styles.ok}>готов</Text>
        </Text>
        <Text style={styles.cardRow}>
          Supabase URL:{" "}
          <Text style={hasSupabaseUrl ? styles.ok : styles.error}>
            {hasSupabaseUrl ? "подключен" : "не найден"}
          </Text>
        </Text>
        <Text style={styles.cardRow}>
          Supabase Key:{" "}
          <Text style={hasSupabaseKey ? styles.ok : styles.error}>
            {hasSupabaseKey ? "подключен" : "не найден"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0f10",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff"
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: "#9ca3af"
  },
  card: {
    marginTop: 28,
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: "#17181a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12
  },
  cardRow: {
    fontSize: 15,
    color: "#d1d5db",
    marginTop: 8
  },
  ok: {
    color: "#86efac",
    fontWeight: "700"
  },
  error: {
    color: "#fca5a5",
    fontWeight: "700"
  }
});