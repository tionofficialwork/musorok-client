import { useEffect, useRef, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { getAuthSession } from "../lib/auth";
import { AppThemeProvider, useAppTheme } from "../providers/AppThemeProvider";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}

function RootLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, resolvedTheme, isReady: isThemeReady } = useAppTheme();

  const [isChecking, setIsChecking] = useState(true);
  const hasHandledInitialRouteRef = useRef(false);

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
        const isHomeRoute = pathname === "/";

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

        if (!hasHandledInitialRouteRef.current) {
          hasHandledInitialRouteRef.current = true;

          if (!isHomeRoute) {
            router.replace("/");
            return;
          }
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

  if (!isThemeReady || isChecking) {
    return (
      <>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <View
          style={[
            styles.loadingScreen,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});