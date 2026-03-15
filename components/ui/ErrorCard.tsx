import { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import AppCard from "./AppCard";
import { colors, spacing, typography } from "../../lib/theme";

type ErrorCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function ErrorCard({
  title,
  description,
  children,
}: ErrorCardProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.errorTitle,
  },
  description: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: colors.errorText,
  },
});