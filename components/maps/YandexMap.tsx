import React, { forwardRef } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { typography } from "../../lib/theme";

export type YandexMapRegion = {
  lat: number;
  lon: number;
  zoom?: number;
};

export type YandexMapProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: YandexMapRegion;
  showUserPosition?: boolean;
  followUser?: boolean;
  nightMode?: boolean;
  onCameraPositionChangeEnd?: (event: unknown) => void;
};

export function initYandexMap(_apiKey?: string | null) {
  return false;
}

const YandexMapView = forwardRef<View, YandexMapProps>(({ style }, ref) => {
  return (
    <View ref={ref} style={[styles.fallback, style]}>
      <Text style={styles.fallbackTitle}>Карта доступна в мобильной сборке</Text>
      <Text style={styles.fallbackText}>
        Для web-предпросмотра оставляем форму адреса, а точку проверяем на
        телефоне.
      </Text>
    </View>
  );
});

YandexMapView.displayName = "YandexMapView";

export { YandexMapView };

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  fallbackTitle: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: "800",
    color: "#2B2925",
    textAlign: "center",
  },
  fallbackText: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: "#756B5D",
    textAlign: "center",
  },
});
