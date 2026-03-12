import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    packageId?: string;
    packageName?: string;
    price?: string;
  }>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName = typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!packageId || !packageName || !price) {
      setError("Не выбран пакет. Вернитесь назад и выберите пакет заново.");
      return;
    }

    if (!address.trim()) {
      setError("Введите адрес.");
      return;
    }

    if (!phone.trim()) {
      setError("Введите телефон.");
      return;
    }

    setError("");

    router.push({
      pathname: "/order/confirm",
      params: {
        packageId,
        packageName,
        price,
        address: address.trim(),
        phone: phone.trim(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Адрес и телефон" }} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Укажите детали заказа</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Пакет</Text>
            <Text style={styles.summaryValue}>{packageName || "—"}</Text>

            <Text style={styles.summaryLabel}>Цена</Text>
            <Text style={styles.summaryValue}>{price ? `${price} ₽` : "—"}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Адрес</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Например: Грязная 5"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={styles.label}>Телефон</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+7..."
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Далее</Text>
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
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: "#081426",
    borderRadius: 24,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#0F2138",
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 8,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },
  formCard: {
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
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0B1A2E",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#13243A",
  },
  error: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 6,
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