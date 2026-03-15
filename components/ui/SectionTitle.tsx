import { StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../../lib/theme";

type SectionTitleProps = {
  children: string;
};

export default function SectionTitle({ children }: SectionTitleProps) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
});