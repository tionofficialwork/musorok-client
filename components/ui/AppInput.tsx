import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { useMemo } from "react";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AppInputProps = TextInputProps;

export default function AppInput(props: AppInputProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
      <View style={styles.wrapper}>
        <TextInput
            placeholderTextColor={colors.textSecondary}
            {...props}
            style={[styles.input, props.style]}
        />
      </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    wrapper: {
      width: "100%",
    },
    input: {
      minHeight: 54,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      fontSize: typography.body,
      color: colors.text,
    },
  });
}