import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../lib/theme";

type EmptyStateProps = {
  title: string;
  description: string;
  extraText?: string | null;
  actions?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  extraText,
  actions,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {extraText ? <Text style={styles.extraText}>{extraText}</Text> : null}

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 520,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  extraText: {
    fontSize: typography.bodySmall,
    color: colors.errorText,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});