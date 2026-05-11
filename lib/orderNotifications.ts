import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { getNotificationPreferences } from "./notificationPreferences";
import { getOrderStatusLabel } from "./orderStatus";

const ORDER_STATUS_CHANNEL_ID = "order-status-updates";

type OrderStatusNotificationInput = {
  id: string | number;
  status: string | null;
  package_label?: string | null;
};

let isConfigured = false;

function getExpoProjectId() {
  const constants = Constants as typeof Constants & {
    easConfig?: {
      projectId?: string;
    };
  };
  const projectId =
    constants.expoConfig?.extra?.eas?.projectId ?? constants.easConfig?.projectId;

  return typeof projectId === "string" && projectId ? projectId : null;
}

export async function configureOrderNotifications() {
  if (isConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ORDER_STATUS_CHANNEL_ID, {
      name: "Статусы заказов",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#93D19C",
    });
  }

  isConfigured = true;
}

export async function requestOrderNotificationPermission() {
  await configureOrderNotifications();

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    await syncOrderPushTokenIfAllowed();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  const granted = requested.granted;

  if (granted) {
    await syncOrderPushTokenIfAllowed();
  }

  return granted;
}

export async function syncOrderPushTokenIfAllowed() {
  await configureOrderNotifications();

  if (Platform.OS === "web") {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return false;
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    return false;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;

  if (!token) {
    return false;
  }

  await api.pushTokens.save({
    token,
    platform: Platform.OS,
  });

  return true;
}

export async function deleteOrderPushTokenIfPossible() {
  await configureOrderNotifications();

  if (Platform.OS === "web") {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return false;
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    return false;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;

  if (!token) {
    return false;
  }

  await api.pushTokens.delete(token);

  return true;
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isQuietHoursNow(start: string, end: string) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function notifyOrderStatusChanged(
  order: OrderStatusNotificationInput
) {
  try {
    const preferences = await getNotificationPreferences();

    if (!preferences.systemEnabled || !preferences.orderUpdatesEnabled) {
      return;
    }

    if (
      preferences.quietHoursEnabled &&
      isQuietHoursNow(preferences.quietHoursStart, preferences.quietHoursEnd)
    ) {
      return;
    }

    const hasPermission = await requestOrderNotificationPermission();

    if (!hasPermission) {
      return;
    }

    const statusLabel = getOrderStatusLabel(order.status);
    const body = order.package_label
      ? `${order.package_label}: ${statusLabel}`
      : `Новый статус: ${statusLabel}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Статус заказа изменился",
        body,
        sound: true,
        data: {
          orderId: String(order.id),
          status: order.status ?? "",
        },
      },
      trigger:
        Platform.OS === "android" ? { channelId: ORDER_STATUS_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn("Failed to show order status notification", error);
  }
}
