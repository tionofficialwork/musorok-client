import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Yamap, YamapInstance } from "react-native-yamap-plus";

import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ScreenSection from "../../components/ui/ScreenSection";
import SectionTitle from "../../components/ui/SectionTitle";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type MapParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
  address?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  addressLabel?: string;
  comment?: string;
  phone?: string;
  shouldCall?: string;
  paymentMethod?: string;
  tip?: string;
  total?: string;
  latitude?: string;
  longitude?: string;
};

type SelectedPoint = {
  latitude: number;
  longitude: number;
};

const DEFAULT_POINT: SelectedPoint = {
  latitude: 45.03547,
  longitude: 38.975313,
};

const YANDEX_MAPKIT_API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;

let isYandexMapInitialized = false;

const YandexMapView = Yamap as any;
const YandexMapInstance = YamapInstance as any;

function initYandexMap() {
  if (!YANDEX_MAPKIT_API_KEY || isYandexMapInitialized) {
    return;
  }

  if (typeof YandexMapInstance.init === "function") {
    YandexMapInstance.init(YANDEX_MAPKIT_API_KEY);
  }

  if (typeof YandexMapInstance.setLocale === "function") {
    YandexMapInstance.setLocale("ru_RU").catch(() => null);
  }

  isYandexMapInitialized = true;
}

function parseNumberParam(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildAddressLabel(
    reverseResult?: Location.LocationGeocodedAddress | null,
    fallbackPoint?: SelectedPoint | null
) {
  if (reverseResult) {
    const line1 = [reverseResult.street, reverseResult.streetNumber]
        .filter(Boolean)
        .join(" ");
    const line2 = [reverseResult.city, reverseResult.region]
        .filter(Boolean)
        .join(", ");

    const parts = [line1, line2].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  if (fallbackPoint) {
    return `Координаты: ${fallbackPoint.latitude.toFixed(6)}, ${fallbackPoint.longitude.toFixed(6)}`;
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

export default function OrderMapScreen() {
  initYandexMap();

  const mapRef = useRef<any>(null);
  const router = useRouter();
  const params = useLocalSearchParams<MapParams>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
      typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const shouldCall =
      typeof params.shouldCall === "string" ? params.shouldCall : "false";
  const paymentMethod =
      typeof params.paymentMethod === "string" ? params.paymentMethod : "card";
  const tip = typeof params.tip === "string" ? params.tip : "0";
  const total = typeof params.total === "string" ? params.total : price;

  const initialAddress =
      typeof params.address === "string" ? params.address : "";
  const initialApartment =
      typeof params.apartment === "string" ? params.apartment : "";
  const initialEntrance =
      typeof params.entrance === "string" ? params.entrance : "";
  const initialFloor = typeof params.floor === "string" ? params.floor : "";
  const initialIntercom =
      typeof params.intercom === "string" ? params.intercom : "";
  const initialAddressLabel =
      typeof params.addressLabel === "string" ? params.addressLabel : "";
  const initialComment =
      typeof params.comment === "string" ? params.comment : "";

  const initialLatitude = parseNumberParam(
      typeof params.latitude === "string" ? params.latitude : undefined
  );
  const initialLongitude = parseNumberParam(
      typeof params.longitude === "string" ? params.longitude : undefined
  );

  const initialPoint =
      initialLatitude !== null && initialLongitude !== null
          ? {
            latitude: initialLatitude,
            longitude: initialLongitude,
          }
          : DEFAULT_POINT;

  const [mapCenterPoint, setMapCenterPoint] =
      useState<SelectedPoint>(initialPoint);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
      initialLatitude !== null && initialLongitude !== null ? initialPoint : null
  );
  const [resolvedAddress, setResolvedAddress] = useState(initialAddress);
  const [apartment, setApartment] = useState(initialApartment);
  const [entrance, setEntrance] = useState(initialEntrance);
  const [floor, setFloor] = useState(initialFloor);
  const [intercom, setIntercom] = useState(initialIntercom);
  const [addressLabel, setAddressLabel] = useState(initialAddressLabel);
  const [comment, setComment] = useState(initialComment);

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canConfirm = useMemo(() => {
    return Boolean(selectedPoint && resolvedAddress.trim());
  }, [selectedPoint, resolvedAddress]);

  const resolveAddressByCoords = useCallback(async (point: SelectedPoint) => {
    try {
      setIsResolvingAddress(true);
      setErrorText(null);

      const result = await Location.reverseGeocodeAsync({
        latitude: point.latitude,
        longitude: point.longitude,
      });

      const address = buildAddressLabel(result?.[0], point);
      setResolvedAddress(address);

      const suggestedLabel =
          typeof result?.[0]?.street === "string" &&
          result[0].street.trim().length > 0
              ? result[0].street.trim()
              : "";

      setAddressLabel((current) => {
        if (current.trim().length > 0) {
          return current;
        }

        return suggestedLabel;
      });
    } catch (error) {
      console.error("Reverse geocode error:", error);
      setResolvedAddress(buildAddressLabel(null, point));
      setErrorText(
          "Не удалось точно определить адрес. Можно использовать выбранные координаты."
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
      setErrorText(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setErrorText(
            "Нет доступа к геолокации. Разреши доступ к местоположению или выбери точку на карте."
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
      setErrorText("Не удалось получить текущее местоположение.");
    } finally {
      setIsLoadingLocation(false);
    }
  }, [moveMapToPoint, resolveAddressByCoords]);

  useEffect(() => {
    if (selectedPoint && !initialAddress) {
      resolveAddressByCoords(selectedPoint);
      return;
    }

    if (!selectedPoint) {
      moveToCurrentLocation();
    }
  }, [initialAddress, moveToCurrentLocation, resolveAddressByCoords, selectedPoint]);

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

  const handleConfirmAddress = useCallback(() => {
    if (!selectedPoint || !resolvedAddress.trim()) {
      Alert.alert(
          "Адрес не выбран",
          "Перемести карту на нужную точку и нажми «Подтвердить точку»."
      );
      return;
    }

    if (!packageId.trim()) {
      Alert.alert("Не выбран пакет", "Вернись назад и выбери тариф заново.");
      return;
    }

    router.push({
      pathname: "/order/confirm",
      params: {
        packageId,
        packageName,
        price,
        address: resolvedAddress.trim(),
        apartment: apartment.trim(),
        entrance: entrance.trim(),
        floor: floor.trim(),
        intercom: intercom.trim(),
        addressLabel: addressLabel.trim(),
        comment: comment.trim(),
        phone,
        shouldCall,
        paymentMethod,
        tip,
        total,
        latitude: String(selectedPoint.latitude),
        longitude: String(selectedPoint.longitude),
      },
    });
  }, [
    addressLabel,
    apartment,
    comment,
    entrance,
    floor,
    intercom,
    packageId,
    packageName,
    paymentMethod,
    phone,
    price,
    resolvedAddress,
    router,
    selectedPoint,
    shouldCall,
    tip,
    total,
  ]);

  const selectedCoordsText = selectedPoint
      ? `${selectedPoint.latitude.toFixed(6)}, ${selectedPoint.longitude.toFixed(6)}`
      : `${mapCenterPoint.latitude.toFixed(6)}, ${mapCenterPoint.longitude.toFixed(6)}`;

  return (
      <>
        <Stack.Screen options={{ title: "Адрес на карте" }} />

        <AppScreen>
          <KeyboardAvoidingView
              style={styles.keyboard}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
              <ScreenSection>
                <ScreenHeader
                    title="Выбери адрес на карте"
                    subtitle="Перемести карту так, чтобы метка была на нужной точке, затем подтверди адрес."
                />

                {!YANDEX_MAPKIT_API_KEY ? (
                    <ErrorCard
                        title="Не указан ключ Яндекс.Карт"
                        description="Добавь EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY в .env и EAS Environment Variables."
                    />
                ) : null}

                {errorText ? (
                    <ErrorCard
                        title="Есть проблема с адресом"
                        description={errorText}
                        actionLabel="Попробовать ещё раз"
                        onAction={moveToCurrentLocation}
                    />
                ) : null}

                <AppCard style={styles.mapCard}>
                  <View style={styles.mapHeaderRow}>
                    <SectionTitle>Карта</SectionTitle>
                  </View>

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

                  <View style={styles.cardButtons}>
                    <AppButton
                        title="Моё местоположение"
                        variant="secondary"
                        onPress={moveToCurrentLocation}
                        disabled={isLoadingLocation || isResolvingAddress}
                    />
                    <AppButton
                        title="Подтвердить точку"
                        onPress={handlePickCenterPoint}
                        disabled={isLoadingLocation || isResolvingAddress}
                    />
                  </View>
                </AppCard>

                <AppCard>
                  <SectionTitle>Выбранный адрес</SectionTitle>

                  {isResolvingAddress ? (
                      <View style={styles.resolvingRow}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.resolvingText}>Определяем адрес...</Text>
                      </View>
                  ) : (
                      <>
                        <Text style={styles.addressText}>
                          {resolvedAddress || "Пока адрес не подтверждён"}
                        </Text>
                        <Text style={styles.coordsText}>{selectedCoordsText}</Text>
                      </>
                  )}
                </AppCard>

                <AppCard>
                  <SectionTitle>Детали адреса</SectionTitle>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Название адреса</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Например: Дом, Работа"
                        placeholderTextColor={colors.textSecondary}
                        value={addressLabel}
                        onChangeText={setAddressLabel}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Квартира</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Например: 24"
                        placeholderTextColor={colors.textSecondary}
                        value={apartment}
                        onChangeText={setApartment}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.label}>Этаж</Text>
                      <TextInput
                          style={styles.input}
                          placeholder="5"
                          placeholderTextColor={colors.textSecondary}
                          value={floor}
                          onChangeText={setFloor}
                      />
                    </View>

                    <View style={styles.formCol}>
                      <Text style={styles.label}>Подъезд</Text>
                      <TextInput
                          style={styles.input}
                          placeholder="2"
                          placeholderTextColor={colors.textSecondary}
                          value={entrance}
                          onChangeText={setEntrance}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Домофон</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Например: 24К"
                        placeholderTextColor={colors.textSecondary}
                        value={intercom}
                        onChangeText={setIntercom}
                    />
                  </View>

                  <View style={styles.formGroupNoMargin}>
                    <Text style={styles.label}>Комментарий для курьера</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="Например: вход со двора, не звонить в дверь"
                        placeholderTextColor={colors.textSecondary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        textAlignVertical="top"
                    />
                  </View>
                </AppCard>

                <View style={styles.footerButtons}>
                  <AppButton
                      title="Продолжить"
                      onPress={handleConfirmAddress}
                      disabled={!canConfirm}
                  />
                </View>
              </ScreenSection>
            </ScrollView>
          </KeyboardAvoidingView>
        </AppScreen>
      </>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    keyboard: {
      flex: 1,
    },
    content: {
      paddingBottom: spacing.xl,
    },
    mapCard: {
      gap: spacing.md,
    },
    mapHeaderRow: {
      marginBottom: -spacing.sm,
    },
    mapWrap: {
      height: 340,
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    mapFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    mapFallbackText: {
      fontSize: typography.body,
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
      gap: spacing.sm,
      backgroundColor: colors.overlay,
    },
    mapOverlayText: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    cardButtons: {
      gap: spacing.md,
    },
    resolvingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    resolvingText: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    addressText: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.text,
      fontWeight: "700",
    },
    coordsText: {
      marginTop: spacing.sm,
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
    },
    formGroup: {
      marginBottom: spacing.md,
    },
    formGroupNoMargin: {
      marginBottom: 0,
    },
    formRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    formCol: {
      flex: 1,
    },
    label: {
      marginBottom: spacing.sm,
      fontSize: typography.body,
      fontWeight: "700",
      color: colors.text,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: typography.body,
      color: colors.text,
      backgroundColor: colors.surfaceSecondary,
    },
    textarea: {
      minHeight: 110,
    },
    footerButtons: {
      marginTop: spacing.md,
    },
  });
}