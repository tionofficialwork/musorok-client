import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../lib/theme";

type InfoRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

export default function InfoRow({
  label,
  value,
  isLast = false,
}: InfoRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  value: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.text,
  },
});