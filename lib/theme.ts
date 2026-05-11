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
  background: "#FFF2D6",
  surface: "#FFF8E8",
  surfaceSecondary: "#F3E3BF",
  text: "#2B2925",
  textSecondary: "#6F6656",
  textMuted: "#8C806A",
  primary: "#8FD99D",
  primarySoft: "#E2F4D9",
  border: "#E8D5AD",
  errorBg: "#FFF0EA",
  errorBorder: "#F2C6B8",
  errorText: "#A44128",
  errorTitle: "#7D2D1B",
  black: "#111111",
  white: "#FFFFFF",
  success: "#3FAF65",
  warning: "#B7791F",
  shadow: "#000000",
  overlay: "rgba(43, 41, 37, 0.08)",
};

export const darkColors: AppColors = {
  background: "#171912",
  surface: "#20251A",
  surfaceSecondary: "#283321",
  text: "#FFF2D6",
  textSecondary: "#D4C6A8",
  textMuted: "#AFA184",
  primary: "#93D19C",
  primarySoft: "#263F2B",
  border: "#3B4B31",
  errorBg: "#2D1E1B",
  errorBorder: "#6A3A30",
  errorText: "#F1A58F",
  errorTitle: "#FFD8CB",
  black: "#111111",
  white: "#FFFFFF",
  success: "#93D19C",
  warning: "#E6B85C",
  shadow: "#000000",
  overlay: "rgba(246, 241, 230, 0.08)",
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
  fontFamily: "Nunito",
  fontFamilyBold: "Nunito-Bold",
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
