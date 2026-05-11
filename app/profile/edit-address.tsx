import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../lib/api";
import { cleanAddressForDisplay } from "../../lib/addressDisplay";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AddressType = string;
const DEFAULT_ADDRESS_TYPES = ["Дом", "Работа", "Другое"];

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

export default function EditAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const addressId = typeof params.id === "string" ? params.id : "";

  const [addressType, setAddressType] = useState<AddressType>(
    DEFAULT_ADDRESS_TYPES[0]
  );
  const [customAddressTypes, setCustomAddressTypes] = useState<string[]>([]);
  const [newAddressType, setNewAddressType] = useState("");
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

  const addressTypes = useMemo(
    () => [...DEFAULT_ADDRESS_TYPES, ...customAddressTypes],
    [customAddressTypes]
  );

  const handleAddAddressType = () => {
    const nextType = newAddressType.trim();

    if (!nextType) {
      return;
    }

    const exists = addressTypes.some(
      (type) => type.toLowerCase() === nextType.toLowerCase()
    );

    if (!exists) {
      setCustomAddressTypes((current) => [...current, nextType]);
    }

    setAddressType(nextType);
    setNewAddressType("");
  };

  const loadAddress = useCallback(async () => {
    if (!addressId) {
      setIsLoading(false);
      Alert.alert("Ошибка", "Не найден идентификатор адреса.");
      router.back();
      return;
    }

    try {
      setIsLoading(true);

      const { addresses } = await api.addresses.list();
      const data = addresses.find((item) => item.id === addressId);

      if (!data) {
        Alert.alert("Ошибка", "Адрес не найден.");
        router.back();
        return;
      }

      const item = data as AddressRow;

      const nextLabel = item.label || DEFAULT_ADDRESS_TYPES[0];
      setAddressType(nextLabel);
      if (!DEFAULT_ADDRESS_TYPES.includes(nextLabel)) {
        setCustomAddressTypes((current) =>
          current.includes(nextLabel) ? current : [...current, nextLabel]
        );
      }
      setStreet(cleanAddressForDisplay(item.street));
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

      await api.addresses.update(addressId, {
        label: addressType,
        street: cleanAddressForDisplay(street),
        apartment: apartment.trim() || null,
        entrance: entrance.trim() || null,
        floor: floor.trim() || null,
        comment: comment.trim() || null,
        is_primary: isPrimary,
      });

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
              Подтягиваем данные сохранённого адреса.
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
                <Text style={styles.title}>Редактировать адрес</Text>
                <Text style={styles.description}>
                  Измени тип адреса, детали и комментарий для курьера.
                </Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Тип адреса</Text>

                <View style={styles.chipsRow}>
                  {addressTypes.map((type) => {
                    const isSelected = addressType === type;

                    return (
                      <Pressable
                        key={type}
                        onPress={() => setAddressType(type)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.addTypeRow}>
                  <TextInput
                    value={newAddressType}
                    onChangeText={setNewAddressType}
                    placeholder="Например: Дача"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.addTypeInput]}
                  />

                  <Pressable
                    onPress={handleAddAddressType}
                    disabled={!newAddressType.trim()}
                    style={({ pressed }) => [
                      styles.addTypeButton,
                      !newAddressType.trim() && styles.addTypeButtonDisabled,
                      pressed &&
                        Boolean(newAddressType.trim()) &&
                        styles.addTypeButtonPressed,
                    ]}
                  >
                    <Text style={styles.addTypeButtonText}>Добавить</Text>
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
                    placeholder="Например: Петра Метальникова, 40"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, styles.thirdField]}>
                    <Text style={styles.label}>Подъезд</Text>
                    <TextInput
                      value={entrance}
                      onChangeText={setEntrance}
                      placeholder="2"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.thirdField]}>
                    <Text style={styles.label}>Этаж</Text>
                    <TextInput
                      value={floor}
                      onChangeText={setFloor}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <View style={[styles.fieldGroup, styles.thirdField]}>
                    <Text style={styles.label}>Квартира</Text>
                    <TextInput
                      value={apartment}
                      onChangeText={setApartment}
                      placeholder="24"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Комментарий для курьера</Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Например: домофон не работает"
                    placeholderTextColor={colors.textMuted}
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
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={isPrimary ? colors.white : colors.surface}
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

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
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
    paddingBottom: 210,
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
    backgroundColor: colors.surfaceSecondary,
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
  addTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  addTypeInput: {
    flex: 1,
  },
  addTypeButton: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addTypeButtonDisabled: {
    opacity: 0.45,
  },
  addTypeButtonPressed: {
    opacity: 0.9,
  },
  addTypeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
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
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  thirdField: {
    flex: 1,
    flexBasis: "30%",
    minWidth: 88,
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
    paddingBottom: 30,
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
    color: colors.white,
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
