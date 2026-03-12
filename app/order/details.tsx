import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{
    packageId?: string;
    packageLabel?: string;
  }>();

  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");

  const canContinue = useMemo(() => {
    return address.trim() && apartment.trim() && phone.trim();
  }, [address, apartment, phone]);

  const handleContinue = () => {
    if (!canContinue) return;

    router.push({
      pathname: "/order/confirm",
      params: {
        packageId: params.packageId ?? "",
        packageLabel: params.packageLabel ?? "",
        address: address.trim(),
        apartment: apartment.trim(),
        phone: phone.trim(),
        comment: comment.trim(),
      },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.step}>Шаг 2 из 4</Text>
      <Text style={styles.title}>Детали заказа</Text>
      <Text style={styles.subtitle}>
        Пакет: <Text style={styles.bold}>{params.packageLabel ?? "Не выбран"}</Text>
      </Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Адрес</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Введите адрес"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Квартира</Text>
          <TextInput
            value={apartment}
            onChangeText={setApartment}
            placeholder="Например, 24"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Телефон</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+7 (999) 123-45-67"
            placeholderTextColor="#6b7280"
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Комментарий</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Например, пакет у двери"
            placeholderTextColor="#6b7280"
            style={[styles.input, styles.textarea]}
            multiline
          />
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue}
      >
        <Text style={styles.primaryButtonText}>Продолжить</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Назад</Text>
      </Pressable>
    </ScrollView>
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
  bold: {
    color: "#ffffff",
    fontWeight: "700",
  },
  form: {
    marginTop: 24,
    gap: 14,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d1d5db",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#17181a",
    color: "#ffffff",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#2c3807",
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
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