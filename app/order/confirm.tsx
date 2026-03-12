import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { prices } from "../../lib/constants";
import { createOrder } from "../../lib/createOrder";

export default function OrderConfirmScreen() {
  const params = useLocalSearchParams<{
    packageId?: string;
    packageLabel?: string;
    address?: string;
    apartment?: string;
    phone?: string;
    comment?: string;
  }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedPrice =
    prices.find((item) => item.id === params.packageId) ?? prices[1];

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const createdOrder = await createOrder({
        address: params.address ?? "",
        packageId: params.packageId ?? "",
        packageLabel: params.packageLabel ?? "",
        packagePrice: selectedPrice.price,
        apartment: params.apartment ?? "",
        phone: params.phone ?? "",
        comment: params.comment ?? "",
      });

      console.log("order created", createdOrder);

      router.replace("/order/success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось создать заказ.";

      console.log("create order error", error);
      setSubmitError(message);

      Alert.alert("Ошибка создания заказа", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.step}>Шаг 3 из 4</Text>
      <Text style={styles.title}>Подтверждение заказа</Text>
      <Text style={styles.subtitle}>
        Сейчас экран уже пытается реально создать заказ в Supabase.
      </Text>

      <View style={styles.card}>
        <Row label="Пакет" value={params.packageLabel ?? "—"} />
        <Row label="Цена" value={`${selectedPrice.price} ₽`} />
        <Row label="Адрес" value={params.address ?? "—"} />
        <Row label="Квартира" value={params.apartment ?? "—"} />
        <Row label="Телефон" value={params.phone ?? "—"} />
        <Row label="Комментарий" value={params.comment || "Без комментария"} />
      </View>

      {submitError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
        onPress={handleConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Подтвердить заказ</Text>
        )}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Назад</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0e0f10",
  },
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 32,
  },
  step: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#86efac",
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#9ca3af",
  },
  card: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#17181a",
    padding: 18,
    gap: 14,
  },
  row: {
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  rowValue: {
    fontSize: 16,
    lineHeight: 22,
    color: "#ffffff",
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.35)",
    backgroundColor: "rgba(127, 29, 29, 0.22)",
    padding: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#2c3807",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});