import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getAddressesOwnerKey } from "../../lib/addressIdentity";

type UserAddress = {
  id: string;
  created_at: string;
  owner_key: string;
  label: string;
  street: string;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  comment: string | null;
  is_primary: boolean;
};

function buildAddressMeta(item: UserAddress) {
  const parts = [
    item.apartment ? `кв. ${item.apartment}` : null,
    item.entrance ? `подъезд ${item.entrance}` : null,
    item.floor ? `этаж ${item.floor}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Детали адреса не указаны";
}

export default function ProfileAddressesScreen() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);

  const loadAddresses = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorText("");

      const ownerKey = await getAddressesOwnerKey();

      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("owner_key", ownerKey)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setAddresses((data ?? []) as UserAddress[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось загрузить адреса";
      setErrorText(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  const handleAddAddress = () => {
    router.push("/profile/new-address");
  };

  const handleEditAddress = (item: UserAddress) => {
    router.push({
      pathname: "/profile/edit-address",
      params: {
        id: item.id,
      },
    });
  };

  const handleSetPrimary = async (addressId: string) => {
    try {
      setBusyAddressId(addressId);
      const ownerKey = await getAddressesOwnerKey();

      const { error: resetError } = await supabase
        .from("user_addresses")
        .update({ is_primary: false })
        .eq("owner_key", ownerKey)
        .eq("is_primary", true);

      if (resetError) {
        throw resetError;
      }

      const { error: setError } = await supabase
        .from("user_addresses")
        .update({ is_primary: true })
        .eq("id", addressId)
        .eq("owner_key", ownerKey);

      if (setError) {
        throw setError;
      }

      await loadAddresses(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось сделать адрес основным";

      Alert.alert("Ошибка", message);
    } finally {
      setBusyAddressId(null);
    }
  };

  const confirmDeleteAddress = (addressId: string) => {
    Alert.alert(
      "Удалить адрес?",
      "Адрес исчезнет из профиля. Это действие можно будет повторить только через создание нового адреса.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => handleDeleteAddress(addressId),
        },
      ]
    );
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      setBusyAddressId(addressId);
      const ownerKey = await getAddressesOwnerKey();

      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", addressId)
        .eq("owner_key", ownerKey);

      if (error) {
        throw error;
      }

      await loadAddresses(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось удалить адрес";

      Alert.alert("Ошибка", message);
    } finally {
      setBusyAddressId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Мои адреса",
          headerShadowVisible: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Профиль</Text>
            <Text style={styles.title}>Сохраненные адреса</Text>
            <Text style={styles.description}>
              Здесь хранятся адреса из Supabase. Теперь можно редактировать,
              выбирать основной адрес и удалять лишние.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="small" color="#E9281D" />
              <Text style={styles.stateText}>Загружаем адреса...</Text>
            </View>
          ) : null}

          {!isLoading && errorText ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Не удалось загрузить адреса</Text>
              <Text style={styles.errorText}>{errorText}</Text>

              <Pressable
                onPress={() => loadAddresses(true)}
                style={({ pressed }) => [
                  styles.inlineButton,
                  pressed && styles.inlineButtonPressed,
                ]}
              >
                <Text style={styles.inlineButtonText}>Повторить</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading && !errorText && addresses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Пока адресов нет</Text>
              <Text style={styles.emptyText}>
                Добавь первый адрес, и он появится здесь. Потом его можно будет
                использовать в заказах и профиле.
              </Text>
            </View>
          ) : null}

          {!isLoading && !errorText && addresses.length > 0 ? (
            <View style={styles.section}>
              {addresses.map((item) => {
                const isBusy = busyAddressId === item.id;

                return (
                  <View key={item.id} style={styles.addressCard}>
                    <View style={styles.addressTopRow}>
                      <View style={styles.addressTitleWrap}>
                        <Text style={styles.addressTitle}>{item.label}</Text>

                        {item.is_primary ? (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Основной</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <Text style={styles.addressStreet}>{item.street}</Text>
                    <Text style={styles.addressMeta}>{buildAddressMeta(item)}</Text>

                    {item.comment ? (
                      <Text style={styles.addressComment}>{item.comment}</Text>
                    ) : null}

                    <View style={styles.actionsRow}>
                      <Pressable
                        onPress={() => handleEditAddress(item)}
                        disabled={isBusy}
                        style={({ pressed }) => [
                          styles.secondaryActionButton,
                          isBusy && styles.actionButtonDisabled,
                          pressed &&
                            !isBusy &&
                            styles.secondaryActionButtonPressed,
                        ]}
                      >
                        <Text style={styles.secondaryActionButtonText}>
                          Редактировать
                        </Text>
                      </Pressable>

                      {!item.is_primary ? (
                        <Pressable
                          onPress={() => handleSetPrimary(item.id)}
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.secondaryActionButton,
                            isBusy && styles.actionButtonDisabled,
                            pressed &&
                              !isBusy &&
                              styles.secondaryActionButtonPressed,
                          ]}
                        >
                          <Text style={styles.secondaryActionButtonText}>
                            {isBusy ? "Сохраняем..." : "Сделать основным"}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={styles.primaryHint}>
                          <Text style={styles.primaryHintText}>
                            Этот адрес выбран основным
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={() => confirmDeleteAddress(item.id)}
                        disabled={isBusy}
                        style={({ pressed }) => [
                          styles.dangerActionButton,
                          isBusy && styles.actionButtonDisabled,
                          pressed && !isBusy && styles.dangerActionButtonPressed,
                        ]}
                      >
                        <Text style={styles.dangerActionButtonText}>
                          {isBusy ? "Обработка..." : "Удалить"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {!isLoading && !errorText && addresses.length > 0 ? (
            <Pressable
              onPress={() => loadAddresses(true)}
              style={({ pressed }) => [
                styles.secondaryInlineButton,
                pressed && styles.inlineButtonPressed,
              ]}
            >
              <Text style={styles.secondaryInlineButtonText}>
                Обновить список
              </Text>
            </Pressable>
          ) : null}

          {isRefreshing ? (
            <View style={styles.refreshRow}>
              <ActivityIndicator size="small" color="#E9281D" />
              <Text style={styles.refreshText}>Обновляем...</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleAddAddress}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Добавить адрес</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
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
    paddingBottom: 150,
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
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stateText: {
    fontSize: 14,
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
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  section: {
    gap: 12,
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  addressTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  primaryBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  addressStreet: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    marginBottom: 6,
  },
  addressMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  addressComment: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  actionsRow: {
    gap: 10,
  },
  secondaryActionButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryActionButtonPressed: {
    opacity: 0.92,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  dangerActionButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FDD4D0",
  },
  dangerActionButtonPressed: {
    opacity: 0.92,
  },
  dangerActionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.dangerText,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  primaryHint: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryHintText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  inlineButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  inlineButtonPressed: {
    opacity: 0.92,
  },
  inlineButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryInlineButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryInlineButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  refreshText: {
    fontSize: 13,
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
  secondaryButtonPressed: {
    opacity: 0.92,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
});