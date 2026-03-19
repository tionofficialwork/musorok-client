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
import { Stack, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getOwnerKey } from "../../lib/profileOwner";

export default function ProfileAccountScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [callAllowed, setCallAllowed] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return firstName.trim().length >= 2 && phone.trim().length >= 6;
  }, [firstName, phone]);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorText(null);

      const ownerKey = await getOwnerKey();

      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, phone, call_allowed")
        .eq("owner_key", ownerKey)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone ?? "+7");
        setCallAllowed(data.call_allowed ?? true);
      }
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Не удалось загрузить профиль";

      setErrorText(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!isFormValid || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorText(null);

      const ownerKey = await getOwnerKey();

      const payload = {
        owner_key: ownerKey,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone: phone.trim(),
        call_allowed: callAllowed,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "owner_key" });

      if (error) {
        throw error;
      }

      Alert.alert("Готово", "Данные аккаунта сохранены.");
      router.back();
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Не удалось сохранить профиль";

      Alert.alert("Ошибка", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Мой аккаунт",
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
            <Text style={styles.centerTitle}>Загружаем профиль</Text>
            <Text style={styles.centerText}>
              Подтягиваем сохранённые данные аккаунта из Supabase.
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
                <Text style={styles.title}>Данные аккаунта</Text>
                <Text style={styles.description}>
                  Здесь хранится базовая информация пользователя для заказов,
                  связи и персональных настроек.
                </Text>
              </View>

              {errorText ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Проблема с загрузкой</Text>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Основная информация</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Имя</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Например: Артём"
                    placeholderTextColor="#98A2B3"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Фамилия</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Например: Иванов"
                    placeholderTextColor="#98A2B3"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Телефон</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+7 999 123-45-67"
                    placeholderTextColor="#98A2B3"
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.switchRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.switchTitle}>Разрешить звонок курьера</Text>
                    <Text style={styles.switchSubtitle}>
                      Это пригодится для уточнения деталей заказа
                    </Text>
                  </View>

                  <Switch
                    value={callAllowed}
                    onValueChange={setCallAllowed}
                    trackColor={{ false: "#D0D5DD", true: "#F8B4AE" }}
                    thumbColor={callAllowed ? "#E9281D" : "#FFFFFF"}
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
                  {isSaving ? "Сохраняем..." : "Сохранить"}
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
                <Text style={styles.secondaryButtonText}>Назад</Text>
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
  dangerSoft: "#FFF4F4",
  dangerText: "#B42318",
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
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FDD4D0",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.dangerText,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dangerText,
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