import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getColorsForResolvedTheme,
  type AppColors,
  type ResolvedTheme,
  type ThemeMode,
} from "../lib/theme";

const THEME_MODE_STORAGE_KEY = "musorok_theme_mode";

type AppThemeContextValue = {
  isReady: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: AppColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: React.ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const systemScheme = useColorScheme();

  const [isReady, setIsReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let isMounted = true;

    const loadThemeMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);

        if (!isMounted) {
          return;
        }

        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    loadThemeMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedTheme: ResolvedTheme =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const colors = useMemo(
    () => getColorsForResolvedTheme(resolvedTheme),
    [resolvedTheme]
  );

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  };

  const value = useMemo<AppThemeContextValue>(
    () => ({
      isReady,
      themeMode,
      resolvedTheme,
      colors,
      setThemeMode,
    }),
    [colors, isReady, resolvedTheme, themeMode]
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return context;
}