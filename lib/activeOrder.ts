import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_ORDER_ID_KEY = "musorok_active_order_id";

export async function saveActiveOrder(orderId: string) {
  if (!orderId) return;
  await AsyncStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
}

export async function getActiveOrder() {
  return AsyncStorage.getItem(ACTIVE_ORDER_ID_KEY);
}

export async function clearActiveOrder() {
  await AsyncStorage.removeItem(ACTIVE_ORDER_ID_KEY);
}