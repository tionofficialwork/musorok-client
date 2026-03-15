import { StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../lib/theme";

type StatusPillProps = {
  label: string;
};

export default function StatusPill({ label }: StatusPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  text: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.primary,
  },
});