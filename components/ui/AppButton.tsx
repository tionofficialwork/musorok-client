import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";

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

const COLORS = {
  primary: "#E9281D",
  primaryPressed: "#D11F15",
  textOnPrimary: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  mutedText: "#6B7280",
  card: "#FFFFFF",
  background: "#F5F7FB",
  danger: "#DC2626",
  dangerPressed: "#B91C1C",
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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        pressed && !isDisabled && variant === "primary" && styles.primaryPressed,
        pressed && !isDisabled && variant === "secondary" && styles.secondaryPressed,
        pressed && !isDisabled && variant === "ghost" && styles.ghostPressed,
        pressed && !isDisabled && variant === "danger" && styles.dangerPressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger"
              ? COLORS.textOnPrimary
              : COLORS.text
          }
        />
      ) : (
        <Text
          style={[
            styles.textBase,
            variant === "primary" && styles.primaryText,
            variant === "secondary" && styles.secondaryText,
            variant === "ghost" && styles.ghostText,
            variant === "danger" && styles.dangerText,
            isDisabled && styles.disabledText,
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
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    width: "100%",
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryPressed: {
    backgroundColor: "#F3F4F6",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostPressed: {
    backgroundColor: "#F3F4F6",
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  dangerPressed: {
    backgroundColor: COLORS.dangerPressed,
  },
  disabled: {
    opacity: 0.55,
  },
  textBase: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryText: {
    color: COLORS.textOnPrimary,
  },
  secondaryText: {
    color: COLORS.text,
  },
  ghostText: {
    color: COLORS.text,
  },
  dangerText: {
    color: COLORS.textOnPrimary,
  },
  disabledText: {
    color: COLORS.mutedText,
  },
});