import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import AppButton from "../../components/ui/AppButton";
import {
  canOpenPaymentForStatus,
  getPaymentStatusLabel,
  getOrderPayment,
  isPaymentSuccessful,
  type PaymentStatus,
} from "../../lib/payments";
import { openOrderPaymentSession } from "../../lib/orderPaymentFlow";
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type PaymentReturnParams = {
  orderId?: string;
  result?: string;
  message?: string;
};

const PAYMENT_CHECK_ATTEMPTS = 6;
const PAYMENT_CHECK_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isFinalPaymentStatus(status: PaymentStatus) {
  return [
    "not_started",
    "failed",
    "cancelled",
    "refunded",
    "amount_mismatch",
  ].includes(status);
}

export default function PaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<PaymentReturnParams>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const result = typeof params.result === "string" ? params.result : "";
  const initialMessage =
    typeof params.message === "string" ? params.message : "";

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const replacePostOrderRoute = useCallback(
    (route: Parameters<typeof router.replace>[0]) => {
      router.dismissAll();
      router.replace(route);
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    const checkPayment = async () => {
      try {
        if (!orderId) {
          throw new Error("Не удалось определить заказ.");
        }

        for (let attempt = 0; attempt < PAYMENT_CHECK_ATTEMPTS; attempt += 1) {
          const payment = await getOrderPayment(orderId);

          if (!isMounted) {
            return;
          }

          setStatus(payment.status);

          if (isPaymentSuccessful(payment)) {
            replacePostOrderRoute({
              pathname: "/order/success",
              params: {
                orderId,
                paymentStatus: payment.status,
              },
            });
            return;
          }

          if (
            isFinalPaymentStatus(payment.status) ||
            attempt === PAYMENT_CHECK_ATTEMPTS - 1
          ) {
            break;
          }

          await delay(PAYMENT_CHECK_DELAY_MS);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorText(
          error instanceof Error
            ? error.message
            : "Не удалось проверить статус платежа."
        );
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkPayment();

    return () => {
      isMounted = false;
    };
  }, [orderId, replacePostOrderRoute]);

  const handleRetryPayment = useCallback(async () => {
    if (!orderId || isChecking || isRetrying) {
      return;
    }

    try {
      setIsRetrying(true);
      setErrorText(null);

      const checkedPayment = await openOrderPaymentSession(orderId);
      setStatus(checkedPayment.status);

      if (isPaymentSuccessful(checkedPayment)) {
        replacePostOrderRoute({
          pathname: "/order/success",
          params: {
            orderId,
            paymentStatus: checkedPayment.status,
          },
        });
      }
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Не удалось открыть оплату повторно."
      );
    } finally {
      setIsRetrying(false);
    }
  }, [isChecking, isRetrying, orderId, replacePostOrderRoute]);

  const title =
    result === "init_error"
      ? "Заказ создан"
      : result === "fail"
      ? "Платёж не прошёл"
      : isChecking
        ? "Проверяем оплату"
        : "Статус оплаты";
  const canRetryPayment =
    Boolean(orderId) &&
    !isChecking &&
    canOpenPaymentForStatus(status ?? (result === "fail" ? "failed" : null));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Оплата",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <View style={styles.container}>
        {isChecking ? <ActivityIndicator size="large" color={colors.primary} /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {errorText
            ? errorText
            : result === "init_error" && status === "not_started"
              ? initialMessage ||
                "Оплата пока не началась. Можно повторить открытие платежной формы."
            : status
              ? getPaymentStatusLabel(status)
              : "Мы сверяем статус с Т-Банком."}
        </Text>

        <View style={styles.actions}>
          {canRetryPayment ? (
            <AppButton
              title={isRetrying ? "Открываем оплату..." : "Повторить оплату"}
              onPress={handleRetryPayment}
              disabled={isRetrying}
            />
          ) : null}
          <AppButton
            title="К активному заказу"
            variant={canRetryPayment ? "secondary" : "primary"}
            onPress={() => replacePostOrderRoute("/order/active")}
          />
          <AppButton
            title="На главную"
            variant="secondary"
            onPress={() => replacePostOrderRoute("/")}
          />
        </View>
      </View>
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
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
    },
    actions: {
      alignSelf: "stretch",
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
  });
}
