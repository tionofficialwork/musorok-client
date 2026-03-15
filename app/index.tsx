import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { getActiveOrder } from "../lib/activeOrder";

export default function HomeScreen() {
  const router = useRouter();
  const [checkingOrder, setCheckingOrder] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreActiveOrder = async () => {
      try {
        const activeOrderId = await getActiveOrder();

        if (!isMounted) return;

        if (activeOrderId) {
          router.replace("/order/active");
          return;
        }
      } finally {
        if (isMounted) {
          setCheckingOrder(false);
        }
      }
    };

    restoreActiveOrder();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingOrder) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Проверяем активный заказ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>МУСОРОК</Text>
        <Text style={styles.title}>Вынос мусора по кнопке</Text>
        <Text style={styles.subtitle}>
          Оформите заказ за пару шагов, а дальше мы возьмём всё на себя.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/order/package")}
        >
          <Text style={styles.buttonText}>Начать заказ</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#031225",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  brand: {
    color: "#94A3B8",
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#22C55E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#04110A",
    fontSize: 18,
    fontWeight: "800",
  },
});