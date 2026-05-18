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
import { Stack, useRouter } from "expo-router";
import { api } from "../../lib/api";
import {
  clearAuthSession,
  isValidRussianPhone,
  normalizePhoneInput,
  sanitizeRussianPhoneInput,
} from "../../lib/auth";
import { useAppTheme } from "../../providers/AppThemeProvider";

export default function ProfileAccountScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [callAllowed, setCallAllowed] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return firstName.trim().length >= 2 && isValidRussianPhone(phone);
  }, [firstName, phone]);

  const isBusy = isSaving || isSigningOut || isDeletingAccount;

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorText(null);

      const { profile } = await api.profile.get();

      if (profile) {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setPhone(sanitizeRussianPhoneInput(profile.phone ?? "+7"));
        setCallAllowed(profile.call_allowed ?? true);
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
    if (!isFormValid || isBusy) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorText(null);

      await api.profile.save({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone: normalizePhoneInput(phone),
        call_allowed: callAllowed,
      });

      Alert.alert("Готово", "Данные профиля сохранены.");
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

  const handleSignOut = useCallback(() => {
    if (isBusy) {
      return;
    }

    Alert.alert(
      "Выйти из аккаунта?",
      "Текущая сессия будет завершена, и приложение вернёт тебя на экран входа.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSigningOut(true);
              setErrorText(null);

              await clearAuthSession();
              router.replace("/auth/phone");
            } catch (error: any) {
              const message =
                typeof error?.message === "string"
                  ? error.message
                  : "Не удалось выйти из аккаунта.";

              Alert.alert("Ошибка", message);
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  }, [isBusy, router]);

  const handleDeleteAccount = useCallback(() => {
    if (isBusy) {
      return;
    }

    Alert.alert(
      "Удалить аккаунт?",
      "Мы удалим профиль, адреса, настройки, push-токены и историю заказов. Это действие нельзя отменить.",
      [
        {
          text: "Отмена",
          style: "cancel",
        },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              setErrorText(null);

              await api.profile.deleteAccount();
              await clearAuthSession();
              router.replace("/auth/phone");
            } catch (error: any) {
              const message =
                typeof error?.message === "string"
                  ? error.message
                  : "Не удалось удалить аккаунт.";

              Alert.alert("Ошибка", message);
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  }, [isBusy, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Редактирование профиля",
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
              Подтягиваем сохранённые данные профиля.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {errorText ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Проблема с загрузкой</Text>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              <View style={styles.sectionCard}>
                <Text style={styles.title}>Данные профиля</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Имя</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Например: Артём"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    editable={!isBusy}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Фамилия</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Например: Иванов"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    editable={!isBusy}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Телефон</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(value) =>
                      setPhone(sanitizeRussianPhoneInput(value))
                    }
                    placeholder="+7 999 123-45-67"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, styles.phoneInput, styles.inputReadonly]}
                    keyboardType="phone-pad"
                    editable={false}
                    selectTextOnFocus={false}
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
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={callAllowed ? colors.primary : colors.white}
                    disabled={isBusy}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Сессия</Text>
                <Text style={styles.sessionText}>
                  Можно безопасно завершить текущую сессию и снова пройти вход.
                </Text>

                <Pressable
                  onPress={handleSignOut}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    isBusy && styles.dangerButtonDisabled,
                    pressed && !isBusy && styles.dangerButtonPressed,
                  ]}
                >
                  <Text style={styles.dangerButtonText}>
                    {isSigningOut ? "Выходим..." : "Выйти из аккаунта"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Удаление аккаунта</Text>
                <Text style={styles.sessionText}>
                  Аккаунт и связанные данные будут удалены с сервера. Для нового
                  заказа нужно будет зарегистрироваться заново.
                </Text>

                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    isBusy && styles.dangerButtonDisabled,
                    pressed && !isBusy && styles.dangerButtonPressed,
                  ]}
                >
                  <Text style={styles.deleteButtonText}>
                    {isDeletingAccount ? "Удаляем..." : "Удалить аккаунт"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.bottomBar}>
              <Pressable
                onPress={handleSave}
                disabled={!isFormValid || isBusy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!isFormValid || isBusy) && styles.primaryButtonDisabled,
                  pressed &&
                    isFormValid &&
                    !isBusy &&
                    styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? "Сохраняем..." : "Сохранить"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  isBusy && styles.secondaryButtonDisabled,
                  pressed && !isBusy && styles.secondaryButtonPressed,
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

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
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
    paddingBottom: 250,
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
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.errorTitle,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.errorText,
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
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  inputReadonly: {
    opacity: 0.72,
  },
  phoneInput: {
    textAlign: "center",
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
  sessionText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dangerButtonDisabled: {
    opacity: 0.55,
  },
  dangerButtonPressed: {
    opacity: 0.92,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.errorText,
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.errorText,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
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
}
