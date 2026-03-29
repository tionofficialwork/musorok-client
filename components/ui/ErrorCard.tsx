import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import AppButton from "./AppButton";
import { radii, spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type ErrorCardProps = {
  title?: string;
  message?: string;
  description?: string;
  buttonTitle?: string;
  actionLabel?: string;
  onRetry?: () => void;
  onAction?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export default function ErrorCard({
                                    title = "Что-то пошло не так",
                                    message,
                                    description,
                                    buttonTitle,
                                    actionLabel,
                                    onRetry,
                                    onAction,
                                    style,
                                  }: ErrorCardProps) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const resolvedMessage = description ?? message ?? "Попробуй ещё раз позже.";
  const resolvedButtonTitle = actionLabel ?? buttonTitle ?? "Попробовать снова";
  const resolvedAction = onAction ?? onRetry;

  return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{resolvedMessage}</Text>

        {resolvedAction ? (
            <AppButton
                title={resolvedButtonTitle}
                onPress={resolvedAction}
                variant="secondary"
                style={styles.button}
            />
        ) : null}
      </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      borderRadius: radii.xl,
      padding: spacing.lg,
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.errorText,
    },
    message: {
      marginTop: 6,
      fontSize: typography.bodySmall,
      lineHeight: 20,
      color: colors.errorTitle,
    },
    button: {
      marginTop: 14,
    },
  });
}