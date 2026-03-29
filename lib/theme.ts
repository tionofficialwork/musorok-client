export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export type AppColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  border: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  errorTitle: string;
  black: string;
  white: string;
  success: string;
  warning: string;
  shadow: string;
  overlay: string;
};

export const lightColors: AppColors = {
  background: "#F6F7FB",
  surface: "#FFFFFF",
  surfaceSecondary: "#EEF2F7",
  text: "#111111",
  textSecondary: "#6B7280",
  textMuted: "#6B7280",
  primary: "#E9281D",
  primarySoft: "#FFF1F0",
  border: "#E5E7EB",
  errorBg: "#FFF4F4",
  errorBorder: "#FFD6D3",
  errorText: "#991B1B",
  errorTitle: "#7F1D1D",
  black: "#111111",
  white: "#FFFFFF",
  success: "#16A34A",
  warning: "#D97706",
  shadow: "#000000",
  overlay: "rgba(17, 17, 17, 0.08)",
};

export const darkColors: AppColors = {
  background: "#0F1115",
  surface: "#171A21",
  surfaceSecondary: "#1E2430",
  text: "#F3F4F6",
  textSecondary: "#9CA3AF",
  textMuted: "#9CA3AF",
  primary: "#FF4A3D",
  primarySoft: "#2A1716",
  border: "#2A3140",
  errorBg: "#2C1618",
  errorBorder: "#5C2328",
  errorText: "#FCA5A5",
  errorTitle: "#FECACA",
  black: "#111111",
  white: "#FFFFFF",
  success: "#22C55E",
  warning: "#F59E0B",
  shadow: "#000000",
  overlay: "rgba(255, 255, 255, 0.08)",
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const typography = {
  title: 32,
  h1: 24,
  h2: 20,
  h3: 17,
  body: 15,
  bodySmall: 14,
  caption: 13,
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export function getColorsForResolvedTheme(
    resolvedTheme: ResolvedTheme
): AppColors {
  return resolvedTheme === "dark" ? darkColors : lightColors;
}

/**
 * Legacy export.
 * Нужен, чтобы старые файлы не сломались сразу.
 * Для новых экранов и для экранов, где нужна живая смена темы,
 * используем useAppTheme().
 */
export const colors = lightColors;