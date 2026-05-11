import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppLogo from "../../components/ui/AppLogo";
import RussianPhoneInput from "../../components/ui/RussianPhoneInput";
import { spacing, typography } from "../../lib/theme";
import {
  type AuthFlowMode,
  getAuthSession,
  isValidRussianPhone,
  normalizePhoneInput,
  startPasswordAuth,
  validatePassword,
} from "../../lib/auth";

const authColors = {
  background: "#FFF2D6",
  surface: "#FFF8E8",
  surfaceSoft: "#F3E3BF",
  text: "#2B2925",
  textMuted: "#8C806A",
  primary: "#93D19C",
  primaryDark: "#355F3A",
  border: "#E8D5AD",
  error: "#B42318",
};

export default function AuthPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resetPhone?: string }>();
  const styles = useMemo(() => createStyles(), []);
  const scrollRef = useRef<ScrollView>(null);

  const [flowMode, setFlowMode] = useState<AuthFlowMode>("login");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const normalizedPhone = useMemo(
    () => normalizePhoneInput(`+7${phoneDigits}`),
    [phoneDigits]
  );
  const passwordError = useMemo(() => validatePassword(password), [password]);
  const isPasswordReady =
    flowMode === "login" ? password.length > 0 : !passwordError;
  const canContinue =
    isValidRussianPhone(normalizedPhone) &&
    isPasswordReady &&
    (flowMode === "login" || password === passwordRepeat);

  const handlePhoneDigitsChange = useCallback((digits: string) => {
    setPhoneDigits(digits);
    setErrorText(null);
  }, []);

  const scrollToFormPosition = useCallback((y: number) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  }, []);

  const scrollToPasswordField = useCallback(() => {
    scrollToFormPosition(flowMode === "register" ? 80 : 32);
  }, [flowMode, scrollToFormPosition]);

  const scrollToRepeatPasswordField = useCallback(() => {
    scrollToFormPosition(140);
  }, [scrollToFormPosition]);

  useEffect(() => {
    if (params.resetPhone === "1") {
      setPhoneDigits("");
      setPassword("");
      setPasswordRepeat("");
      setErrorText(null);
    }
  }, [params.resetPhone]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await getAuthSession();

        if (!isMounted) {
          return;
        }

        if (session?.verified) {
          router.replace("/");
          return;
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      if (flowMode === "register" && password !== passwordRepeat) {
        throw new Error("Пароли не совпадают.");
      }

      const challenge = await startPasswordAuth(normalizedPhone, password, flowMode);

      router.push({
        pathname: "/auth/verify",
        params: {
          phone: normalizedPhone,
          flowMode,
          challengeId: challenge.challengeId,
          ...(challenge.code ? { localCode: challenge.code } : {}),
        },
      });
    } catch (error) {
      const fallback =
        flowMode === "login"
          ? "Не удалось войти. Проверьте номер и пароль."
          : "Не удалось зарегистрироваться.";
      const message = error instanceof Error ? error.message : fallback;
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [flowMode, isSubmitting, normalizedPhone, password, passwordRepeat, router]);

  if (isCheckingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Вход" }} />
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Проверяем сессию...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Вход", headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            flowMode === "register" && styles.contentRegister,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.logoWrap}>
            <AppLogo
              size="lg"
              color={authColors.text}
              accentColor={authColors.primary}
            />
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>
              {flowMode === "login" ? "Войдите в аккаунт" : "Создайте аккаунт"}
            </Text>
            <Text style={styles.subtitle}>
              {flowMode === "login"
                ? "Введите номер и пароль, чтобы открыть свой аккаунт."
                : "Создайте пароль, мы сохраним его в защищённом виде."}
            </Text>

            <View style={styles.segment}>
              {(["login", "register"] as const).map((mode) => {
                const isActive = flowMode === mode;

                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setFlowMode(mode);
                      setErrorText(null);
                      scrollRef.current?.scrollTo({ y: 0, animated: true });
                    }}
                    disabled={isSubmitting}
                    style={[
                      styles.segmentItem,
                      isActive && styles.segmentItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isActive && styles.segmentTextActive,
                      ]}
                    >
                      {mode === "login" ? "Вход" : "Регистрация"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Номер телефона</Text>
            <RussianPhoneInput
              digits={phoneDigits}
              onChangeDigits={handlePhoneDigitsChange}
              containerStyle={styles.phoneInput}
              focusedContainerStyle={styles.phoneInputFocused}
              textStyle={styles.phoneInputText}
              placeholderTextStyle={styles.phoneInputPlaceholder}
            />

            <Text style={styles.inputLabel}>Пароль</Text>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrorText(null);
              }}
              placeholder={flowMode === "login" ? "Введите пароль" : "Минимум 8 символов"}
              placeholderTextColor={authColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={flowMode === "login" ? "done" : "next"}
              onFocus={scrollToPasswordField}
              onSubmitEditing={() => {
                if (flowMode === "login") {
                  Keyboard.dismiss();
                }
              }}
              textContentType={flowMode === "login" ? "password" : "newPassword"}
              style={styles.input}
            />

            {flowMode === "register" ? (
              <>
                <Text style={styles.inputLabel}>Повторите пароль</Text>
                <TextInput
                  value={passwordRepeat}
                  onChangeText={(value) => {
                    setPasswordRepeat(value);
                    setErrorText(null);
                  }}
                  placeholder="Ещё раз пароль"
                  placeholderTextColor={authColors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={scrollToRepeatPasswordField}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  textContentType="newPassword"
                  style={styles.input}
                />
              </>
            ) : null}

            {flowMode === "register" ? (
              <Text style={styles.helperText}>
                Пароль должен содержать минимум 8 символов, буквы и цифры.
              </Text>
            ) : null}

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || !canContinue}
              style={({ pressed }) => [
                styles.primaryButton,
                (isSubmitting || !canContinue) && styles.primaryButtonDisabled,
                pressed && canContinue && !isSubmitting
                  ? styles.primaryButtonPressed
                  : undefined,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? flowMode === "login"
                    ? "Входим..."
                    : "Создаём..."
                  : flowMode === "login"
                    ? "Войти"
                    : "Зарегистрироваться"}
                </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles() {
  const fontFamily = typography.fontFamily;

  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      backgroundColor: authColors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: authColors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 26,
      paddingTop: 18,
      paddingBottom: 150,
    },
    contentRegister: {
      paddingTop: 12,
      paddingBottom: 220,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      backgroundColor: authColors.background,
    },
    loadingText: {
      fontFamily,
      fontSize: typography.body,
      color: authColors.textMuted,
      textAlign: "center",
    },
    logoWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    hero: {
      gap: 9,
      alignItems: "stretch",
    },
    title: {
      fontFamily,
      fontSize: 25,
      lineHeight: 31,
      fontWeight: "700",
      color: authColors.text,
      textAlign: "center",
    },
    subtitle: {
      maxWidth: 310,
      alignSelf: "center",
      marginBottom: 6,
      fontFamily,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
      color: authColors.textMuted,
      textAlign: "center",
    },
    segment: {
      height: 50,
      flexDirection: "row",
      borderRadius: 20,
      backgroundColor: authColors.surfaceSoft,
      padding: 4,
      marginBottom: 8,
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
    segmentItemActive: {
      backgroundColor: authColors.surface,
      borderWidth: 1,
      borderColor: authColors.border,
    },
    segmentText: {
      fontFamily,
      fontSize: 16,
      fontWeight: "700",
      color: authColors.textMuted,
    },
    segmentTextActive: {
      fontWeight: "800",
      color: authColors.text,
    },
    inputLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: "800",
      color: authColors.textMuted,
      textAlign: "center",
    },
    input: {
      minHeight: 58,
      borderWidth: 2,
      borderColor: authColors.text,
      borderRadius: 20,
      backgroundColor: authColors.surface,
      paddingHorizontal: 18,
      color: authColors.text,
      fontFamily,
      fontSize: 20,
      fontWeight: "500",
      textAlign: "center",
    },
    phoneInput: {
      minHeight: 58,
      borderWidth: 2,
      borderColor: authColors.text,
      borderRadius: 20,
      backgroundColor: authColors.surface,
      paddingHorizontal: 18,
    },
    phoneInputFocused: {
      backgroundColor: "#FFFDF5",
    },
    phoneInputText: {
      color: authColors.text,
      fontFamily,
      fontSize: 20,
      fontWeight: "500",
      textAlign: "center",
    },
    phoneInputPlaceholder: {
      color: authColors.textMuted,
    },
    helperText: {
      marginTop: -4,
      fontFamily,
      fontSize: 13,
      lineHeight: 18,
      color: authColors.textMuted,
      textAlign: "center",
    },
    errorText: {
      marginTop: -4,
      fontFamily,
      fontSize: typography.body,
      color: authColors.error,
      textAlign: "center",
    },
    actions: {
      marginTop: 22,
      gap: 14,
    },
    primaryButton: {
      minHeight: 58,
      borderRadius: 20,
      backgroundColor: authColors.text,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonText: {
      fontFamily,
      fontSize: 18,
      fontWeight: "800",
      color: authColors.background,
      textAlign: "center",
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
