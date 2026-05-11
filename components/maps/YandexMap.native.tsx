import type { ComponentType } from "react";
import { Yamap, YamapInstance } from "react-native-yamap-plus";
import type { YandexMapProps } from "./YandexMap";

let isYandexMapInitialized = false;

const YandexMapView = Yamap as unknown as ComponentType<YandexMapProps>;
const YandexMapInstance = YamapInstance as {
  init?: (apiKey: string) => void;
  setLocale?: (locale: string) => Promise<void>;
};

export function initYandexMap(apiKey?: string | null) {
  if (!apiKey || isYandexMapInitialized) {
    return false;
  }

  if (typeof YandexMapInstance.init === "function") {
    YandexMapInstance.init(apiKey);
  }

  if (typeof YandexMapInstance.setLocale === "function") {
    YandexMapInstance.setLocale("ru_RU").catch(() => null);
  }

  isYandexMapInitialized = true;
  return true;
}

export { YandexMapView };
