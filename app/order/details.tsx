import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
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
  const [entrance, setEntrance] = useState("");
  const [comment, setComment] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [callRequired, setCallRequired] = useState(false);
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
        entrance: entrance.trim(),
        comment: comment.trim(),
        leaveAtDoor: leaveAtDoor ? "true" : "false",
        callRequired: callRequired ? "true" : "false",
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

            <Text style={styles.label}>Подъезд</Text>
            <TextInput
              value={entrance}
              onChangeText={setEntrance}
              placeholder="Например: 2"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={styles.label}>Комментарий</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Например: домофон не работает"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Оставить у двери</Text>
                <Text style={styles.switchDescription}>
                  Курьер может оставить мусорный пакет у двери, если это допустимо.
                </Text>
              </View>
              <Switch value={leaveAtDoor} onValueChange={setLeaveAtDoor} />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Нужно позвонить</Text>
                <Text style={styles.switchDescription}>
                  Курьер позвонит перед приходом.
                </Text>
              </View>
              <Switch value={callRequired} onValueChange={setCallRequired} />
            </View>

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
    paddingBottom: 32,
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
  textArea: {
    minHeight: 110,
  },
  switchRow: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchDescription: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
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