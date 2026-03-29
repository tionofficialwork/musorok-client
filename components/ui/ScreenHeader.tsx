import { StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({
                                       title,
                                       subtitle,
                                     }: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.h1,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.body,
      lineHeight: 22,
      color: colors.textSecondary,
    },
  });
}