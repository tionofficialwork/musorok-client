import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, typography } from "../../lib/theme";

type AppButtonVariant = "primary" | "secondary" | "outline";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "outline" && styles.outline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" && styles.primaryText,
          variant === "secondary" && styles.secondaryText,
          variant === "outline" && styles.outlineText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.black,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    fontSize: typography.body,
    fontWeight: "800",
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.text,
  },
  disabledText: {
    opacity: 0.9,
  },
});