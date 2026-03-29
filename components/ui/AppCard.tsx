import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { radii, shadows, spacing } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AppCardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
};

export default function AppCard({
                                  children,
                                  style,
                                  padded = true,
                                }: AppCardProps) {
  const { colors } = useAppTheme();

  return (
      <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
            padded && styles.padded,
            style,
          ]}
      >
        {children}
      </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    shadowOpacity: shadows.card.shadowOpacity,
    shadowRadius: shadows.card.shadowRadius,
    shadowOffset: shadows.card.shadowOffset,
    elevation: shadows.card.elevation,
  },
  padded: {
    padding: spacing.lg,
  },
});