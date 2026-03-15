import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../../lib/theme";

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    ...shadows.card,
  },
});