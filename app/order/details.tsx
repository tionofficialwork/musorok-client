import { useMemo, useState } from "react";
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

type DetailsParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
};

function resolvePackageLabel(packageId: string, packageName: string) {
  if (packageName.trim()) {
    return packageName.trim();
  }

  switch (packageId) {
    case "small":
      return "Малый пакет";
    case "medium":
      return "Стандарт";
    case "large":
      return "Большой пакет";
    case "1":
        return "1 пакет";
    case "2-3":
      return "2-3 пакета";
    case "4+":
      return "4+ пакетов";
    default:
      return "Пакет";
  }
}

function resolvePackagePrice(rawPrice: string, packageId: string) {
  const parsed = Number(rawPrice);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  switch (packageId) {
    case "small":
      return 149;
    case "medium":
      return 249;
    case "large":
      return 349;
    case "1":
      return 99;
    case "2-3":
      return 149;
    case "4+":
      return 199;
    default:
      return 0;
  }
}

export default function OrderDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<DetailsParams>();

  const packageId =
    typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const rawPrice = typeof params.price === "string" ? params.price : "";

  const resolvedPackageLabel = useMemo(
    () => resolvePackageLabel(packageId, packageName),
    [packageId, packageName]
  );

  const resolvedPackagePrice = useMemo(
    () => resolvePackagePrice(rawPrice, packageId),
    [rawPrice, packageId]
  );

  const [comment, setComment] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (loading) {
      return;
    }

    if (!address.trim()) {
      Alert.alert("Ошибка", "Введите адрес");
      return;
    }

    if (!packageId.trim()) {
      Alert.alert("Ошибка", "Не выбран пакет. Вернись назад и выбери тариф заново.");
      return;
    }

    try {
      setLoading(true);

      const orderPayload = {
        status: "new",
        address: address.trim(),
        package_id: packageId.trim(),
        package_label: resolvedPackageLabel,
        package_price: resolvedPackagePrice,
        apartment: "",
        entrance: "",
        comment: comment.trim(),
        leave_at_door: false,
        phone: "",
        should_call: false,
        payment_method: "cash",
        tip: 0,
        total: resolvedPackagePrice,
        courier_id: null,
        call_required: false,
      };

      console.log("CREATE ORDER PAYLOAD", orderPayload);

      const { data, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (error) {
        console.log("CREATE ORDER ERROR", error);
        throw error;
      }

      if (!data) {
        throw new Error("Заказ не вернулся после создания");
      }

      console.log("CREATE ORDER SUCCESS", data);

      Alert.alert("Успех", "Заказ создан");

      router.replace("/");
    } catch (error: any) {
      console.log("CREATE ORDER FAILED", error);

      Alert.alert(
        "Ошибка",
        typeof error?.message === "string"
          ? error.message
          : "Не удалось создать заказ"
      );
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
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.title}>{resolvedPackageLabel}</Text>
              <Text style={styles.price}>{resolvedPackagePrice} ₽</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Адрес</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите адрес"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="sentences"
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
                textAlignVertical="top"
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
    color: "#111",
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
    color: "#111",
  },
  textarea: {
    minHeight: 100,
  },
  buttonWrap: {
    marginTop: 20,
  },
});