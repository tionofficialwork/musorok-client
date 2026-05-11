import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import * as Location from "expo-location";
import {
  initYandexMap,
  YandexMapView,
} from "../../components/maps/YandexMap";
import { api } from "../../lib/api";
import {
  buildStreetHouseAddress,
  cleanAddressForDisplay,
} from "../../lib/addressDisplay";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AddressType = string;
type SelectedPoint = {
  latitude: number;
  longitude: number;
};

const DEFAULT_ADDRESS_TYPES = ["Дом", "Работа", "Другое"];

const DEFAULT_POINT: SelectedPoint = {
  latitude: 45.03547,
  longitude: 38.975313,
};

const YANDEX_MAPKIT_API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;

function buildStreetHouseLabel(
  reverseResult?: Location.LocationGeocodedAddress | null,
  fallbackPoint?: SelectedPoint | null
) {
  if (reverseResult) {
    const streetHouse = buildStreetHouseAddress(
      reverseResult.street,
      reverseResult.streetNumber
    );

    if (streetHouse) {
      return streetHouse;
    }
  }

  if (fallbackPoint) {
    return "";
  }

  return "";
}

function getPointFromCameraEvent(event: any): SelectedPoint | null {
  const payload = event?.nativeEvent ?? event;
  const point = payload?.point ?? payload?.target ?? payload?.position ?? payload;

  const latitude = Number(point?.lat ?? point?.latitude);
  const longitude = Number(point?.lon ?? point?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export default function NewAddressScreen() {
  initYandexMap(YANDEX_MAPKIT_API_KEY);

  const mapRef = useRef<any>(null);
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [isSaving, setIsSaving] = useState(false);
  const [mapCenterPoint, setMapCenterPoint] =
    useState<SelectedPoint>(DEFAULT_POINT);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [mapErrorText, setMapErrorText] = useState<string | null>(null);

  const isFormValid = useMemo(() => {
    return street.trim().length >= 5;
  }, [street]);

  const addressTypes = useMemo(
    () => [...DEFAULT_ADDRESS_TYPES, ...customAddressTypes],
    [customAddressTypes]
  );

  const resolveAddressByCoords = useCallback(async (point: SelectedPoint) => {
    try {
      setIsResolvingAddress(true);
      setMapErrorText(null);

      const result = await Location.reverseGeocodeAsync({
        latitude: point.latitude,
        longitude: point.longitude,
      });

      setStreet(buildStreetHouseLabel(result?.[0], point));
    } catch (error) {
      console.error("Reverse geocode error:", error);
      setMapErrorText(
        "Не удалось точно определить адрес. Попробуй сдвинуть карту или введи улицу и дом вручную."
      );
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  const moveMapToPoint = useCallback((point: SelectedPoint) => {
    setMapCenterPoint(point);

    if (typeof mapRef.current?.setCenter === "function") {
      mapRef.current.setCenter(
        {
          lat: point.latitude,
          lon: point.longitude,
        },
        16,
        0,
        0,
        0
      );
    }
  }, []);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      setMapErrorText(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setMapErrorText(
          "Нет доступа к геолокации. Разреши доступ или выбери точку на карте."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setSelectedPoint(nextPoint);
      moveMapToPoint(nextPoint);
      await resolveAddressByCoords(nextPoint);
    } catch (error) {
      console.error("Current location error:", error);
      setMapErrorText("Не удалось получить текущее местоположение.");
    } finally {
      setIsLoadingLocation(false);
    }
  }, [moveMapToPoint, resolveAddressByCoords]);

  useEffect(() => {
    moveToCurrentLocation();
  }, [moveToCurrentLocation]);

  const handleCameraPositionChangeEnd = useCallback((event: any) => {
    const nextPoint = getPointFromCameraEvent(event);

    if (nextPoint) {
      setMapCenterPoint(nextPoint);
    }
  }, []);

  const handlePickCenterPoint = useCallback(async () => {
    setSelectedPoint(mapCenterPoint);
    await resolveAddressByCoords(mapCenterPoint);
  }, [mapCenterPoint, resolveAddressByCoords]);

  const handleAddAddressType = () => {
    const trimmedType = newAddressType.trim();

    if (!trimmedType) {
      return;
    }

    const typeExists = addressTypes.some(
      (type) => type.toLowerCase() === trimmedType.toLowerCase()
    );

    if (!typeExists) {
      setCustomAddressTypes((current) => [...current, trimmedType]);
    }

    setAddressType(trimmedType);
    setNewAddressType("");
  };

  const handleSave = async () => {
    if (!isFormValid || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      await api.addresses.create({
        label: addressType,
        street: cleanAddressForDisplay(street),
        apartment: apartment.trim() || null,
        entrance: entrance.trim() || null,
        floor: floor.trim() || null,
        comment: comment.trim() || null,
        is_primary: isPrimary,
        latitude: selectedPoint?.latitude ?? null,
        longitude: selectedPoint?.longitude ?? null,
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
          title: "Новый адрес",
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroCard}>
            <Text style={styles.title}>Добавить адрес</Text>
            <Text style={styles.description}>
              Сохрани новый адрес для будущих заказов и быстрого выбора.
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
                returnKeyType="done"
                onSubmitEditing={handleAddAddressType}
              />

              <Pressable
                onPress={handleAddAddressType}
                disabled={!newAddressType.trim()}
                style={({ pressed }) => [
                  styles.addTypeButton,
                  !newAddressType.trim() && styles.addTypeButtonDisabled,
                  pressed && newAddressType.trim()
                    ? styles.addTypeButtonPressed
                    : undefined,
                ]}
              >
                <Text style={styles.addTypeButtonText}>Добавить</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Адрес</Text>

            <View style={styles.mapWrap}>
              {YANDEX_MAPKIT_API_KEY ? (
                <YandexMapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    lat: mapCenterPoint.latitude,
                    lon: mapCenterPoint.longitude,
                    zoom: 16,
                  }}
                  showUserPosition
                  followUser={false}
                  nightMode={false}
                  onCameraPositionChangeEnd={handleCameraPositionChangeEnd}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.mapFallbackText}>
                    Яндекс.Карта недоступна без API-ключа.
                  </Text>
                </View>
              )}

              <View pointerEvents="none" style={styles.pinWrap}>
                <View style={styles.centerPinOuter}>
                  <View style={styles.centerPinInner} />
                </View>
              </View>

              {isLoadingLocation ? (
                <View style={styles.mapOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.mapOverlayText}>
                    Определяем местоположение...
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.mapActions}>
              <Pressable
                onPress={moveToCurrentLocation}
                disabled={isLoadingLocation || isResolvingAddress}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (isLoadingLocation || isResolvingAddress) &&
                    styles.secondaryButtonDisabled,
                  pressed &&
                    !isLoadingLocation &&
                    !isResolvingAddress &&
                    styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Моё местоположение</Text>
              </Pressable>

              <Pressable
                onPress={handlePickCenterPoint}
                disabled={isLoadingLocation || isResolvingAddress}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (isLoadingLocation || isResolvingAddress) &&
                    styles.primaryButtonDisabled,
                  pressed &&
                    !isLoadingLocation &&
                    !isResolvingAddress &&
                    styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isResolvingAddress ? "Определяем..." : "Подтвердить точку"}
                </Text>
              </Pressable>
            </View>

            {mapErrorText ? (
              <Text style={styles.mapErrorText}>{mapErrorText}</Text>
            ) : null}

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
              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Квартира</Text>
                <TextInput
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder="24"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Подъезд</Text>
                <TextInput
                  value={entrance}
                  onChangeText={setEntrance}
                  placeholder="2"
                  placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
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
                thumbColor={isPrimary ? colors.primary : colors.white}
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
              pressed && isFormValid && !isSaving && styles.primaryButtonPressed,
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
            <Text style={styles.secondaryButtonText}>Отмена</Text>
          </Pressable>
        </View>
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
    paddingBottom: 210,
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
  mapWrap: {
    height: 300,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
    marginBottom: 12,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  mapFallbackText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPinOuter: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  centerPinInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.overlay,
  },
  mapOverlayText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  mapActions: {
    gap: 10,
    marginBottom: 12,
  },
  mapErrorText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.errorText,
    marginBottom: 8,
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
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  addTypeInput: {
    flex: 1,
  },
  addTypeButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
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
  halfField: {
    flex: 1,
    minWidth: 120,
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
}
