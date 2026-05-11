import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const AUTH_CODE_CHANNEL_ID = "auth-code";

let isAuthCodeChannelConfigured = false;

async function configureAuthCodeNotifications() {
  if (isAuthCodeChannelConfigured) {
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
    await Notifications.setNotificationChannelAsync(AUTH_CODE_CHANNEL_ID, {
      name: "Коды входа",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#93D19C",
    });
  }

  isAuthCodeChannelConfigured = true;
}

export async function showAuthCodeNotification(code: string) {
  if (Platform.OS === "web" || !/^\d{6}$/.test(code)) {
    return false;
  }

  await configureAuthCodeNotifications();

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions = currentPermissions.granted
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();

  if (!permissions.granted) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Код MusorOK",
      body: `Код подтверждения: ${code}`,
      sound: true,
      data: {
        type: "auth_code",
      },
    },
    trigger:
      Platform.OS === "android" ? { channelId: AUTH_CODE_CHANNEL_ID } : null,
  });

  return true;
}
