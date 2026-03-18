import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import { supabase } from "../../lib/supabase";

export default function OrderDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    packageId?: string;
    packageName?: string;
    price?: string;
  }>();

  const packageId =
    typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";

  const [comment, setComment] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (!address) {
      Alert.alert("Ошибка", "Введите адрес");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("orders").insert([
        {
          package_id: packageId,
          address,
          comment,
          status: "new",
        },
      ]);

      if (error) {
        throw error;
      }

      Alert.alert("Успех", "Заказ создан");

      router.replace("/");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Детали заказа" }} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.title}>{packageName}</Text>
              <Text style={styles.price}>{price} ₽</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Адрес</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите адрес"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Например: домофон не работает"
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>

            <View style={styles.buttonWrap}>
              <AppButton
                title={loading ? "Создание..." : "Создать заказ"}
                onPress={handleCreateOrder}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: "#666",
  },

  section: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  buttonWrap: {
    marginTop: 20,
  },
});