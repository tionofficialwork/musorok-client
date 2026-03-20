import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenSection from "../../components/ui/ScreenSection";
import {
  getReorderPreview,
  reorderPreviousOrder,
  type ReorderPreview,
} from "../../lib/reorder";

export default function ReorderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();

  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const [preview, setPreview] = useState<ReorderPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!orderId) {
      setErrorMessage("Не передан ID заказа для повтора.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await getReorderPreview(orderId);
      setPreview(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить заказ для повтора.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleReorder = useCallback(async () => {
    if (!orderId) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await reorderPreviousOrder(orderId);
      setCreatedOrderId(result.newOrderId);

      Alert.alert("Заказ повторён", "Новый заказ создан на основе предыдущего.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось повторить заказ.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }, [orderId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Повтор заказа" }} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <ScreenSection
          title="Повтор заказа"
          description="Создадим новый заказ на основе данных из прошлого. Текущий order flow не изменяется."
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Загружаем данные заказа...</Text>
            </View>
          ) : null}

          {!loading && errorMessage ? (
            <ErrorCard
              title="Не удалось подготовить повтор заказа"
              message={errorMessage}
              actionLabel="Повторить"
              onPress={loadPreview}
            />
          ) : null}

          {!loading && !errorMessage && preview ? (
            <>
              <AppCard>
                <View style={styles.cardHeader}>
                  <Text style={styles.packageName}>{preview.packageName}</Text>
                  <Text style={styles.price}>{preview.priceLabel}</Text>
                </View>

                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Адрес</Text>
                  <Text style={styles.metaValue}>{preview.addressLabel}</Text>
                </View>

                {preview.commentLabel ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Комментарий</Text>
                    <Text style={styles.metaValue}>{preview.commentLabel}</Text>
                  </View>
                ) : null}

                {preview.createdAtLabel ? (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Исходный заказ</Text>
                    <Text style={styles.metaValue}>{preview.createdAtLabel}</Text>
                  </View>
                ) : null}
              </AppCard>

              <AppCard>
                <Text style={styles.noteTitle}>Что произойдёт</Text>
                <Text style={styles.noteText}>
                  Мы создадим новый заказ с теми же данными: пакет, адрес и комментарий.
                </Text>
                <Text style={styles.noteText}>
                  Если уже есть активный заказ, повтор будет заблокирован для безопасности.
                </Text>
              </AppCard>

              {createdOrderId ? (
                <AppCard>
                  <Text style={styles.successTitle}>Новый заказ создан</Text>
                  <Text style={styles.successText}>ID нового заказа: {createdOrderId}</Text>
                </AppCard>
              ) : null}

              <View style={styles.actions}>
                <AppButton
                  label={submitting ? "Создаём..." : "Повторить заказ"}
                  onPress={handleReorder}
                  disabled={submitting}
                />

                <AppButton
                  label="На главную"
                  variant="secondary"
                  onPress={() => router.replace("/")}
                  disabled={submitting}
                />
              </View>
            </>
          ) : null}
        </ScreenSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F8",
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  cardHeader: {
    marginBottom: 12,
  },
  packageName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  metaBlock: {
    marginTop: 12,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111827",
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  successText: {
    fontSize: 15,
    color: "#4B5563",
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
});