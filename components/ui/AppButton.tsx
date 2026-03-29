import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { radii } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: AppButtonVariant;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
};

export default function AppButton({
                                    title,
                                    onPress,
                                    disabled = false,
                                    loading = false,
                                    variant = "primary",
                                    fullWidth = true,
                                    style,
                                    textStyle,
                                  }: AppButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;

  const primaryPressedColor =
      colors.primary === "#E9281D" ? "#D11F15" : "#E03C31";

  const dangerColor = "#DC2626";
  const dangerPressedColor = "#B91C1C";

  const secondaryPressedColor = colors.surfaceSecondary;
  const ghostPressedColor = colors.surfaceSecondary;

  const activityIndicatorColor =
      variant === "primary" || variant === "danger"
          ? colors.white
          : colors.text;

  const buttonTextColor =
      variant === "primary"
          ? colors.white
          : variant === "danger"
              ? colors.white
              : colors.text;

  return (
      <Pressable
          onPress={onPress}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.base,
            fullWidth && styles.fullWidth,
            variant === "primary" && {
              backgroundColor: colors.primary,
            },
            variant === "secondary" && {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
            variant === "ghost" && {
              backgroundColor: "transparent",
            },
            variant === "danger" && {
              backgroundColor: dangerColor,
            },
            pressed &&
            !isDisabled &&
            variant === "primary" && {
              backgroundColor: primaryPressedColor,
            },
            pressed &&
            !isDisabled &&
            variant === "secondary" && {
              backgroundColor: secondaryPressedColor,
            },
            pressed &&
            !isDisabled &&
            variant === "ghost" && {
              backgroundColor: ghostPressedColor,
            },
            pressed &&
            !isDisabled &&
            variant === "danger" && {
              backgroundColor: dangerPressedColor,
            },
            isDisabled && styles.disabled,
            style,
          ]}
      >
        {loading ? (
            <ActivityIndicator color={activityIndicatorColor} />
        ) : (
            <Text
                style={[
                  styles.textBase,
                  {
                    color: buttonTextColor,
                  },
                  isDisabled && {
                    color: colors.textMuted,
                  },
                  textStyle,
                ]}
            >
              {title}
            </Text>
        )}
      </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.55,
  },
  textBase: {
    fontSize: 16,
    fontWeight: "700",
  },
});