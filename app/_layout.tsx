import { useEffect, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { getAuthSession } from "../lib/auth";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkStartupState = async () => {
      try {
        const completedOnboarding = await hasCompletedOnboarding();
        const authSession = await getAuthSession();

        if (!isMounted) {
          return;
        }

        const isOnboardingRoute = pathname.startsWith("/onboarding");
        const isAuthRoute = pathname.startsWith("/auth");

        if (!completedOnboarding) {
          if (!isOnboardingRoute) {
            router.replace("/onboarding");
            return;
          }

          return;
        }

        if (!authSession?.verified) {
          if (!isAuthRoute) {
            router.replace("/auth/phone");
            return;
          }

          return;
        }

        if (isOnboardingRoute || isAuthRoute) {
          router.replace("/");
          return;
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkStartupState();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isChecking) {
    return (
      <>
        <StatusBar style="light" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#0e0f10",
          },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0e0f10",
    alignItems: "center",
    justifyContent: "center",
  },
});