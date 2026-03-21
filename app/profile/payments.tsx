import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  DEFAULT_PAYMENT_PREFERENCES,
  getPaymentPreferences,
  savePaymentPreferences,
  type PaymentMethod,
  type PaymentPreferences,
} from "../../lib/paymentPreferences";

const TIP_PRESETS = [0, 50, 100, 150, 200];

export default function PaymentsScreen() {
  const [preferences, setPreferences] = useState<PaymentPreferences>(
    DEFAULT_PAYMENT_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setErrorText(null);

    const data = await getPaymentPreferences();
    setPreferences(data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        const data = await getPaymentPreferences();

        if (!isMounted) {
          return;
        }

        setPreferences(data);
        setErrorText(null);
      } catch (error) {
        console.error("Failed to bootstrap payment preferences", error);

        if (isMounted) {
          setErrorText("Не удалось загрузить настройки оплаты.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await loadPreferences();
    } catch (error) {
      console.error("Failed to refresh payment preferences", error);
      setErrorText("Не удалось загрузить настройки оплаты.");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPreferences]);

  const persist = useCallback(async (patch: Partial<PaymentPreferences>) => {
    setIsSaving(true);
    setErrorText(null);

    try {
      const saved = await savePaymentPreferences(patch);
      setPreferences(saved);
    } catch (error) {
      console.error("Failed to save payment preferences", error);
      setErrorText("Не удалось сохранить настройки оплаты.");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const setDefaultMethod = useCallback(
    async (method: PaymentMethod) => {
      if (isSaving) {
        return;
      }

      if (method === "card" && !preferences.allowCard) {
        return;
      }

      if (method === "cash" && !preferences.allowCash) {
        return;
      }

      await persist({ defaultMethod: method });
    },
    [isSaving, persist, preferences.allowCard, preferences.allowCash],
  );

  const toggleAllowCard = useCallback(
    async (value: boolean) => {
      if (isSaving) {
        return;
      }

      if (!value && !preferences.allowCash) {
        Alert.alert(
          "Нужно оставить хотя бы один способ оплаты",
          "Нельзя отключить сразу и карту, и наличные.",
        );
        return;
      }

      const patch: Partial<PaymentPreferences> = {
        allowCard: value,
      };

      if (!value && preferences.defaultMethod === "card") {
        patch.defaultMethod = "cash";
      }

      await persist(patch);
    },
    [isSaving, persist, preferences.allowCash, preferences.defaultMethod],
  );

  const toggleAllowCash = useCallback(
    async (value: boolean) => {
      if (isSaving) {
        return;
      }

      if (!value && !preferences.allowCard) {
        Alert.alert(
          "Нужно оставить хотя бы один способ оплаты",
          "Нельзя отключить сразу и карту, и наличные.",
        );
        return;
      }

      const patch: Partial<PaymentPreferences> = {
        allowCash: value,
      };

      if (!value && preferences.defaultMethod === "cash") {
        patch.defaultMethod = "card";
      }

      await persist(patch);
    },
    [isSaving, persist, preferences.allowCard, preferences.defaultMethod],
  );

  const toggleAskBeforeChangingMethod = useCallback(
    async (value: boolean) => {
      if (isSaving) {
        return;
      }

      await persist({ askBeforeChangingMethod: value });
    },
    [isSaving, persist],
  );

  const setDefaultTip = useCallback(
    async (value: number) => {
      if (isSaving) {
        return;
      }

      await persist({ defaultTip: value });
    },
    [isSaving, persist],
  );

  const summaryText = useMemo(() => {
    const defaultMethodLabel =
      preferences.defaultMethod === "card" ? "карта" : "наличные";

    const enabledMethods = [
      preferences.allowCard ? "карта" : null,
      preferences.allowCash ? "наличные" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const tipLabel =
      preferences.defaultTip > 0
        ? `${preferences.defaultTip} ₽ чаевых`
        : "без чаевых";

    return `По умолчанию: ${defaultMethodLabel}. Доступно: ${enabledMethods}. ${tipLabel}.`;
  }, [preferences]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Оплата" }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" />
          <Text style={styles.centerText}>Загружаем настройки оплаты…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Оплата" }} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <ScreenSection
          title="Способы оплаты"
          description="Эти настройки теперь сохраняются в Supabase и станут основой для будущей автоподстановки в заказ."
        >
          <AppCard>
            <Text style={styles.summaryLabel}>Сводка</Text>
            <Text style={styles.summaryValue}>{summaryText}</Text>

            {isSaving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator />
                <Text style={styles.savingText}>Сохраняем…</Text>
              </View>
            ) : null}
          </AppCard>
        </ScreenSection>

        {errorText ? (
          <ErrorCard
            title="Ошибка настроек оплаты"
            description={errorText}
          />
        ) : null}

        <ScreenSection
          title="Метод по умолчанию"
          description="Позже это можно будет аккуратно подставлять в order flow без переписывания details.tsx."
        >
          <View style={styles.group}>
            <MethodButton
              title="Карта"
              isSelected={preferences.defaultMethod === "card"}
              disabled={!preferences.allowCard || isSaving}
              onPress={() => setDefaultMethod("card")}
            />
            <MethodButton
              title="Наличные"
              isSelected={preferences.defaultMethod === "cash"}
              disabled={!preferences.allowCash || isSaving}
              onPress={() => setDefaultMethod("cash")}
            />
          </View>
        </ScreenSection>

        <ScreenSection
          title="Разрешённые способы"
          description="Оставляем только те способы оплаты, которые реально нужны пользователю."
        >
          <AppCard>
            <ToggleRow
              title="Разрешить оплату картой"
              description="Карта остаётся доступным способом оплаты."
              value={preferences.allowCard}
              onValueChange={toggleAllowCard}
              disabled={isSaving}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Разрешить оплату наличными"
              description="Наличные остаются резервным способом оплаты."
              value={preferences.allowCash}
              onValueChange={toggleAllowCash}
              disabled={isSaving}
            />

            <View style={styles.divider} />

            <ToggleRow
              title="Подтверждать смену метода"
              description="Foundation для будущей более аккуратной логики в оформлении заказа."
              value={preferences.askBeforeChangingMethod}
              onValueChange={toggleAskBeforeChangingMethod}
              disabled={isSaving}
            />
          </AppCard>
        </ScreenSection>

        <ScreenSection
          title="Чаевые по умолчанию"
          description="Пока это preference layer. Позже можно будет использовать как prefill."
        >
          <View style={styles.group}>
            {TIP_PRESETS.map((value) => (
              <MethodButton
                key={value}
                title={value === 0 ? "Без чаевых" : `${value} ₽`}
                isSelected={preferences.defaultTip === value}
                disabled={isSaving}
                onPress={() => setDefaultTip(value)}
              />
            ))}
          </View>
        </ScreenSection>

        <ScreenSection
          title="Статус foundation"
          description="На этом шаге мы усиливаем payments, но не трогаем текущий рабочий заказ."
        >
          <AppCard>
            <Text style={styles.noteText}>
              Следующий безопасный шаг после этого — либо notifications foundation,
              либо аккуратный prefill payment/address data в order flow без ломки
              текущего поведения.
            </Text>
          </AppCard>
        </ScreenSection>
      </ScrollView>
    </SafeAreaView>
  );
}

type MethodButtonProps = {
  title: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function MethodButton({
  title,
  isSelected,
  disabled = false,
  onPress,
}: MethodButtonProps) {
  return (
    <AppButton
      title={title}
      onPress={onPress}
      variant={isSelected ? "primary" : "secondary"}
      disabled={disabled}
      fullWidth
    />
  );
}

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  centerText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#111827",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  savingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  group: {
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
});