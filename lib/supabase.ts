import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is missing");
}

if (!supabaseAnonKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let hasRegisteredAppStateListener = false;

function handleAppStateChange(state: AppStateStatus) {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
    return;
  }

  supabase.auth.stopAutoRefresh();
}

if (!hasRegisteredAppStateListener) {
  AppState.addEventListener("change", handleAppStateChange);
  hasRegisteredAppStateListener = true;
}