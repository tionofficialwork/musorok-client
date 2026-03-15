import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";

import { getActiveOrder } from "../lib/activeOrder";

export default function HomeScreen() {
  const router = useRouter();

  const [checkingOrder, setCheckingOrder] = useState(true);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const loadActiveOrderState = useCallback(async () => {
    try {
      const storedActiveOrderId = await getActiveOrder();

      setActiveOrderId(storedActiveOrderId);
      setHasActiveOrder(Boolean(storedActiveOrderId));
    } finally {
      setCheckingOrder(false);
    }
  }, []);

  useEffect(() => {
    loadActiveOrderState();
  }, [loadActiveOrderState]);

  useFocusEffect(
    useCallback(() => {
      loadActiveOrderState();
    }, [loadActiveOrderState])
  );

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

        {hasActiveOrder ? (
          <View style={styles.activeOrderCard}>
            <Text style={styles.activeOrderBadge}>АКТИВНЫЙ ЗАКАЗ</Text>
            <Text style={styles.activeOrderTitle}>У вас есть активный заказ</Text>
            <Text style={styles.activeOrderText}>
              {activeOrderId
                ? `Заказ #${activeOrderId} сейчас в работе.`
                : "Ваш заказ сейчас в работе."}
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push("/order/active")}
              >
                <Text style={styles.primaryButtonText}>Открыть заказ</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/order/history")}
              >
                <Text style={styles.secondaryButtonText}>История заказов</Text>
              </Pressable>

              <Pressable
                style={styles.ghostButton}
                onPress={() => router.push("/order/package")}
              >
                <Text style={styles.ghostButtonText}>Новый заказ</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/order/package")}
            >
              <Text style={styles.primaryButtonText}>Начать заказ</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/order/history")}
            >
              <Text style={styles.secondaryButtonText}>История заказов</Text>
            </Pressable>
          </View>
        )}
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
  activeOrderCard: {
    backgroundColor: "#081426",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  activeOrderBadge: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },
  activeOrderTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  activeOrderText: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#22C55E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#04110A",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#081426",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  ghostButton: {
    backgroundColor: "#0B1A2E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#13243A",
  },
  ghostButtonText: {
    color: "#CBD5E1",
    fontSize: 17,
    fontWeight: "700",
  },
});