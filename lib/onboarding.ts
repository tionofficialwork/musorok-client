import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "musorok_onboarding_completed";

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
}

export async function getOnboardingState(): Promise<{
  completed: boolean;
}> {
  const completed = await hasCompletedOnboarding();

  return {
    completed,
  };
}

export default {
  hasCompletedOnboarding,
  completeOnboarding,
  resetOnboarding,
  getOnboardingState,
};