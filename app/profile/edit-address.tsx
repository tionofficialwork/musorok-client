import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "../../lib/supabase";
import { getOwnerKey } from "../../lib/profileOwner";

type AddressType = "home" | "work" | "other";

type AddressRow = {
  id: string;
  label: string;
  street: string;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  comment: string | null;
  is_primary: boolean;
};

function getTypeByLabel(label: string | null): AddressType {
  if (label === "Дом") {
    return "home";
  }

  if (label === "Работа") {
    return "work";
  }

  return "other";
}

function getLabelByType(addressType: AddressType) {
  if (addressType === "home") {
    return "Дом";
  }

  if (addressType === "work") {
    return "Работа";
  }

  return "Другое";
}

export default function EditAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const addressId = typeof params.id === "string" ? params.id : "";

  const [addressType, setAddressType] = useState<AddressType>("home");
  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [comment, setComment] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExistingPrimary, setIsExistingPrimary] = useState(false);

  const isFormValid = useMemo(() => {
    return street.trim().length >= 5 && addressId.length > 0;
  }, [street, addressId]);

  const loadAddress = useCallback(async () => {
    if (!addressId) {
      setIsLoading(false);
      Alert.alert("Ошибка", "Не найден идентификатор адреса.");
      router.back();
      return;
    }

    try {
      setIsLoading(true);

      const ownerKey = await getOwnerKey();

      const { data, error } = await supabase
        .from("user_addresses")
        .select("id, label, street, apartment, entrance, floor, comment, is_primary")
        .eq("id", addressId)
        .eq("owner_key", ownerKey)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        Alert.alert("Ошибка", "Адрес не найден.");
        router.back();
        return;
      }

      const item = data as AddressRow;

      setAddressType(getTypeByLabel(item.label));
      setStreet(item.street ?? "");
      setApartment(item.apartment ?? "");
      setEntrance(item.entrance ?? "");
      setFloor(item.floor ?? "");
      setComment(item.comment ?? "");
      setIsPrimary(item.is_primary);
      setIsExistingPrimary(item.is_primary);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить адрес";
      Alert.alert("Ошибка", message);
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [addressId, router]);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const handleSave = async () => {
    if (!isFormValid || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const ownerKey = await getOwnerKey();

      if (isPrimary && !isExistingPrimary) {
        const { error: resetError } = await supabase
          .from("user_addresses")
          .update({ is_primary: false })
          .eq("owner_key", ownerKey)
          .eq("is_primary", true);

        if (resetError) {
          throw resetError;
        }
      }

      const payload = {
        label: getLabelByType(addressType),
        street: street.trim(),
        apartment: apartment.trim() || null,
        entrance: entrance.trim() || null,
        floor: floor.trim() || null,
        comment: comment.trim() || null,
        is_primary: isPrimary,
      };

      const { error } = await supabase
        .from("user_addresses")
        .update(payload)
        .eq("id", addressId)
        .eq("owner_key", ownerKey);

      if (error) {
        throw error;
      }

      router.replace("/profile/addresses");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось сохранить адрес";

      Alert.alert("Ошибка", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Редактировать адрес",
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerTitle}>Загружаем адрес</Text>
            <Text style={styles.centerText}>
              Подтягиваем данные сохранённого адреса из Supabase.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.heroCard}>
                <Text style={styles.eyebrow}>Профиль</Text>
                <Text style={styles.title}>Редактировать адрес</Text>
                <Text style={styles.description}>
                  Измени тип адреса, детали и комментарий для курьера.
                </Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Тип адреса</Text>

                <View style={styles.chipsRow}>
                  <Pressable
                    onPress={() => setAddressType("home")}
                    style={[
                      styles.chip,
                      addressType === "home" && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        addressType === "home" && styles.chipTextActive,
                      ]}
                    >
                      Дом
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setAddressType("work")}
                    style={[
                      styles.chip,
                      addressType === "work" && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        addressType === "work" && styles.chipTextActive,
                      ]}
                    >
                      Работа
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setAddressType("other")}
                    style={[
                      styles.chip,
                      addressType === "other" && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        addressType === "other" && styles.chipTextActive,
                      ]}
                    >
                      Другое
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Адрес</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Улица, дом</Text>
                  <TextInput
                    value={street}
                    onChangeText={setStreet}
                    placeholder="Например: ул. Ленина, 12"
                    placeholderTextColor="#98A2B3"
                    style={styles.input}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, styles.halfField]}>
                    <Text style={styles.label}>Квартира</Text>
                    <TextInput
                      value={apartment}
                      onChangeText={setApartment}
                      placeholder="24"
                      placeholderTextColor="#98A2B3"
                      style={styles.input}
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.halfField]}>
                    <Text style={styles.label}>Подъезд</Text>
                    <TextInput
                      value={entrance}
                      onChangeText={setEntrance}
                      placeholder="2"
                      placeholderTextColor="#98A2B3"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Этаж</Text>
                  <TextInput
                    value={floor}
                    onChangeText={setFloor}
                    placeholder="5"
                    placeholderTextColor="#98A2B3"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Комментарий для курьера</Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Например: домофон не работает"
                    placeholderTextColor="#98A2B3"
                    style={[styles.input, styles.textArea]}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.switchRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.switchTitle}>Сделать основным</Text>
                    <Text style={styles.switchSubtitle}>
                      Этот адрес будет первым в будущем быстром заказе
                    </Text>
                  </View>

                  <Switch
                    value={isPrimary}
                    onValueChange={setIsPrimary}
                    trackColor={{ false: "#D0D5DD", true: "#F8B4AE" }}
                    thumbColor={isPrimary ? "#E9281D" : "#FFFFFF"}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomBar}>
              <Pressable
                onPress={handleSave}
                disabled={!isFormValid || isSaving}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!isFormValid || isSaving) && styles.primaryButtonDisabled,
                  pressed &&
                    isFormValid &&
                    !isSaving &&
                    styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? "Сохраняем..." : "Сохранить изменения"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  isSaving && styles.secondaryButtonDisabled,
                  pressed && !isSaving && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Отмена</Text>
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = {
  background: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#E7ECF3",
  text: "#16181D",
  textSecondary: "#667085",
  primary: "#E9281D",
  primarySoft: "#FFF1F0",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 160,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  centerText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  switchSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonPressed: {
    opacity: 0.92,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
});