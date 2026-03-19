import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "musorok_owner_key";

function generateKey() {
  return `owner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getOwnerKey() {
  const existing = await AsyncStorage.getItem(KEY);

  if (existing) return existing;

  const newKey = generateKey();
  await AsyncStorage.setItem(KEY, newKey);

  return newKey;
}