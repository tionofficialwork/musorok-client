import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { createOrder, PaymentMethod } from "../../lib/createOrder";

export default function ConfirmScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    packageId?: string;
    packageName?: string;
    price?: string;
    address?: string;
    phone?: string;
    entrance?: string;
    comment?: string;
    leaveAtDoor?: string;
    callRequired?: string;
  }>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName = typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? Number(params.price) : 0;
  const address = typeof params.address === "string" ? params.address : "";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const entrance = typeof params.entrance === "string" ? params.entrance : "";
  const comment = typeof params.comment === "string" ? params.comment : "";
  const leaveAtDoor = params.leaveAtDoor === "true";
  const callRequired = params.callRequired === "true";

  const paymentMethod: PaymentMethod = "card";
  const total = price;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!packageId || !packageName || !price || !address || !phone) {
      setError("Не хватает данных заказа. Вернитесь назад и заполните шаги заново.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const order = await createOrder({
        package_id: packageId,
        package_label: packageName,
        package_price: price,
        total,
        address,
        phone,
        entrance,
        comment,
        leave_at_door: leaveAtDoor,
        call_required: callRequired,
        payment_method: paymentMethod,
      });

      if (!order?.id) {
        throw new Error("Не удалось получить ID созданного заказа.");
      }

      router.replace({
        pathname: "/order/success",
        params: {
          orderId: String(order.id),
        },
      });
    } catch (e: any) {
      setError(e?.message || "Ошибка создания заказа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Подтвердить заказ" }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Подтвердить заказ</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Адрес</Text>
            <Text style={styles.value}>{address || "—"}</Text>

            <Text style={styles.label}>Телефон</Text>
            <Text style={styles.value}>{phone || "—"}</Text>

            <Text style={styles.label}>Подъезд</Text>
            <Text style={styles.value}>{entrance || "—"}</Text>

            <Text style={styles.label}>Комментарий</Text>
            <Text style={styles.value}>{comment || "—"}</Text>

            <Text style={styles.label}>Оставить у двери</Text>
            <Text style={styles.value}>{leaveAtDoor ? "Да" : "Нет"}</Text>

            <Text style={styles.label}>Нужно позвонить</Text>
            <Text style={styles.value}>{callRequired ? "Да" : "Нет"}</Text>

            <Text style={styles.label}>Пакет</Text>
            <Text style={styles.value}>{packageName || "—"}</Text>

            <Text style={styles.label}>Цена</Text>
            <Text style={styles.value}>{price ? `${price} ₽` : "—"}</Text>

            <Text style={styles.label}>Оплата</Text>
            <Text style={styles.value}>Картой</Text>

            <Text style={styles.label}>Итого</Text>
            <Text style={styles.value}>{total ? `${total} ₽` : "—"}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleConfirm} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#04110A" />
            ) : (
              <Text style={styles.buttonText}>Подтвердить</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#031225",
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#081426",
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 10,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  error: {
    color: "#F87171",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#22C55E",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "#04110A",
    fontSize: 18,
    fontWeight: "800",
  },
});