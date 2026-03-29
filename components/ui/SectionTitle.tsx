import { StyleSheet, Text } from "react-native";
import { useMemo } from "react";
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type SectionTitleProps = {
  children: string;
};

export default function SectionTitle({ children }: SectionTitleProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <Text style={styles.title}>{children}</Text>;
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    title: {
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing.md,
    },
  });
}