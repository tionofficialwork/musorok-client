import { useMemo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AppLogoProps = {
  size?: "sm" | "md" | "lg";
  style?: ViewStyle | ViewStyle[];
  color?: string;
  accentColor?: string;
};

export default function AppLogo({
  size = "md",
  style,
  color,
  accentColor,
}: AppLogoProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(
    () =>
      createStyles({
        text: color ?? colors.text,
        primary: accentColor ?? colors.primary,
      }),
    [accentColor, color, colors.primary, colors.text]
  );
  const textStyle =
    size === "lg" ? styles.logoLarge : size === "sm" ? styles.logoSmall : styles.logo;

  return (
    <View style={[styles.wrap, style]}>
      <Text style={textStyle}>
        Мусор <Text style={styles.accent}>ОК</Text>
      </Text>
    </View>
  );
}

function createStyles(colors: { text: string; primary: string }) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      fontFamily: typography.fontFamily,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "500",
      color: colors.text,
      textAlign: "center",
    },
    logoSmall: {
      fontFamily: typography.fontFamily,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "500",
      color: colors.text,
      textAlign: "center",
    },
    logoLarge: {
      fontFamily: typography.fontFamily,
      fontSize: 42,
      lineHeight: 48,
      fontWeight: "500",
      color: colors.text,
      textAlign: "center",
    },
    accent: {
      fontFamily: typography.fontFamilyBold,
      color: colors.primary,
      fontWeight: "800",
    },
  });
}
