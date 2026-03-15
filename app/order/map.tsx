import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppScreen from "../../components/ui/AppScreen";
import ErrorCard from "../../components/ui/ErrorCard";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ScreenSection from "../../components/ui/ScreenSection";
import SectionTitle from "../../components/ui/SectionTitle";
import { colors, radii, spacing, typography } from "../../lib/theme";

type MapParams = {
  packageId?: string;
  packageName?: string;
  price?: string;
  address?: string;
  apartment?: string;
  entrance?: string;
  comment?: string;
  leave_at_door?: string;
  call_required?: string;
};

type SelectedPoint = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION: Region = {
  latitude: 43.238949,
  longitude: 76.889709,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

function buildAddressLabel(
  reverseResult?: Location.LocationGeocodedAddress | null,
  fallbackPoint?: SelectedPoint | null
) {
  if (reverseResult) {
    const parts = [
      reverseResult.street,
      reverseResult.streetNumber,
      reverseResult.city,
      reverseResult.region,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  if (fallbackPoint) {
    return `${fallbackPoint.latitude.toFixed(6)}, ${fallbackPoint.longitude.toFixed(6)}`;
  }

  return "";
}

export default function OrderMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<MapParams>();

  const packageId = typeof params.packageId === "string" ? params.packageId : "";
  const packageName =
    typeof params.packageName === "string" ? params.packageName : "";
  const price = typeof params.price === "string" ? params.price : "";
  const currentAddress =
    typeof params.address === "string" ? params.address : "";
  const apartment =
    typeof params.apartment === "string" ? params.apartment : "";
  const entrance = typeof params.entrance === "string" ? params.entrance : "";
  const comment = typeof params.comment === "string" ? params.comment : "";
  const leaveAtDoor =
    typeof params.leave_at_door === "string" ? params.leave_at_door : "false";
  const callRequired =
    typeof params.call_required === "string" ? params.call_required : "false";

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState(currentAddress);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canConfirm = useMemo(() => {
    return Boolean(selectedPoint && resolvedAddress.trim());
  }, [selectedPoint, resolvedAddress]);

  const resolveAddressByCoords = useCallback(
    async (point: SelectedPoint) => {
      try {
        setIsResolvingAddress(true);
        setErrorText(null);

        const result = await Location.reverseGeocodeAsync({
          latitude: point.latitude,
          longitude: point.longitude,
        });

        const addressLabel = buildAddressLabel(result?.[0], point);
        setResolvedAddress(addressLabel);
      } catch (error) {
        console.error("Reverse geocode error:", error);
        setResolvedAddress(buildAddressLabel(null, point));
        setErrorText("Не удалось точно определить адрес. Можно использовать координаты.");
      } finally {
        setIsResolvingAddress(false);
      }
    },
    []
  );

  const moveToCurrentLocation = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      setErrorText(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setErrorText("Нет доступа к геолокации. Разреши доступ или выбери точку вручную.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const nextRegion: Region = {
        ...nextPoint,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setSelectedPoint(nextPoint);
      setRegion(nextRegion);

      await resolveAddressByCoords(nextPoint);
    } catch (error) {
      console.error("Current location error:", error);
      setErrorText("Не удалось получить текущее местоположение.");
    } finally {
      setIsLoadingLocation(false);
    }
  }, [resolveAddressByCoords]);

  useEffect(() => {
    moveToCurrentLocation();
  }, [moveToCurrentLocation]);

  const handleMapPress = useCallback(
    async (event: MapPressEvent) => {
      const point = {
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      };

      setSelectedPoint(point);
      await resolveAddressByCoords(point);
    },
    [resolveAddressByCoords]
  );

  const handleConfirmAddress = useCallback(() => {
    if (!selectedPoint || !resolvedAddress.trim()) {
      Alert.alert("Адрес не выбран", "Выбери точку на карте или используй своё местоположение.");
      return;
    }

    router.replace({
      pathname: "/order/details",
      params: {
        packageId,
        packageName,
        price,
        address: resolvedAddress.trim(),
        apartment,
        entrance,
        comment,
        leave_at_door: leaveAtDoor,
        call_required: callRequired,
      },
    });
  }, [
    apartment,
    callRequired,
    comment,
    entrance,
    leaveAtDoor,
    packageId,
    packageName,
    price,
    resolvedAddress,
    router,
    selectedPoint,
  ]);

  return (
    <>
      <Stack.Screen options={{ title: "Выбор адреса на карте" }} />

      <AppScreen>
        <ScreenSection>
          <ScreenHeader
            title="Выбери адрес на карте"
            subtitle="Можно использовать своё местоположение или нажать на точку на карте."
          />

          {errorText ? (
            <ErrorCard
              title="Есть проблема с геолокацией"
              description={errorText}
            >
              <AppButton
                title="Попробовать ещё раз"
                variant="secondary"
                onPress={moveToCurrentLocation}
              />
            </ErrorCard>
          ) : null}

          <AppCard style={styles.mapCard}>
            <View style={styles.mapHeaderRow}>
              <SectionTitle>Карта</SectionTitle>
            </View>

            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                initialRegion={region}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {selectedPoint ? <Marker coordinate={selectedPoint} /> : null}
              </MapView>

              {isLoadingLocation ? (
                <View style={styles.mapOverlay}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.mapOverlayText}>Определяем местоположение...</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardButtons}>
              <AppButton
                title="Моё местоположение"
                variant="outline"
                onPress={moveToCurrentLocation}
              />
            </View>
          </AppCard>

          <AppCard>
            <SectionTitle>Выбранный адрес</SectionTitle>

            {isResolvingAddress ? (
              <View style={styles.resolvingRow}>
                <ActivityIndicator />
                <Text style={styles.resolvingText}>Определяем адрес...</Text>
              </View>
            ) : (
              <Text style={styles.addressText}>
                {resolvedAddress || "Пока ничего не выбрано"}
              </Text>
            )}

            <View style={styles.confirmButtonWrap}>
              <AppButton
                title="Использовать этот адрес"
                onPress={handleConfirmAddress}
                disabled={!canConfirm}
              />
            </View>
          </AppCard>
        </ScreenSection>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#E5E7EB",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.8)",
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
  confirmButtonWrap: {
    marginTop: spacing.lg,
  },
});