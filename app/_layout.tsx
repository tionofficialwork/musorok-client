import { useEffect, useRef, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { getAuthSession } from "../lib/auth";
import {
  configureOrderNotifications,
  syncOrderPushTokenIfAllowed,
} from "../lib/orderNotifications";
import { typography } from "../lib/theme";
import { AppThemeProvider, useAppTheme } from "../providers/AppThemeProvider";

const APP_VERSION = "0.0.1";
const SHOW_APP_VERSION =
  __DEV__ || process.env.EXPO_PUBLIC_SHOW_APP_VERSION === "true";

function applyDefaultFont() {
  const textComponent = Text as typeof Text & {
    defaultProps?: Record<string, unknown>;
  };
  const textInputComponent = TextInput as typeof TextInput & {
    defaultProps?: Record<string, unknown>;
  };
  const defaultTextProps = textComponent.defaultProps ?? {};
  const defaultTextInputProps = textInputComponent.defaultProps ?? {};

  textComponent.defaultProps = {
    ...defaultTextProps,
    style: [defaultTextProps.style, { fontFamily: typography.fontFamily }],
  };
  textInputComponent.defaultProps = {
    ...defaultTextInputProps,
    style: [
      defaultTextInputProps.style,
      { fontFamily: typography.fontFamily },
    ],
  };
}

applyDefaultFont();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, resolvedTheme, isReady: isThemeReady } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Nunito: require("../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Bold": require("../assets/fonts/Nunito-Bold.ttf"),
  });

  const [isChecking, setIsChecking] = useState(true);
  const hasHandledInitialRouteRef = useRef(false);

  useEffect(() => {
    configureOrderNotifications().catch((error) => {
      console.warn("Failed to configure notifications", error);
    });
  }, []);

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

        if (!hasHandledInitialRouteRef.current) {
          hasHandledInitialRouteRef.current = true;

          syncOrderPushTokenIfAllowed().catch((error) => {
            console.warn("Failed to sync push token", error);
          });
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

  if (!isThemeReady || !fontsLoaded || isChecking) {
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
          {SHOW_APP_VERSION ? <AppVersionLabel color={colors.textMuted} /> : null}
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <View style={styles.appShell}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        />
        {SHOW_APP_VERSION ? <AppVersionLabel color={colors.textMuted} /> : null}
      </View>
    </>
  );
}

function AppVersionLabel({ color }: { color: string }) {
  return (
    <Text
      pointerEvents="none"
      style={[
        styles.versionLabel,
        {
          color,
        },
      ]}
    >
      v{APP_VERSION}
    </Text>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  versionLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
    zIndex: 1000,
    opacity: 0.42,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    textAlign: "center",
  },
});
