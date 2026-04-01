import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { radii, typography } from "../../lib/theme";
import {
  getOrderStatusLabel,
  getOrderStatusTone,
} from "../../lib/orderStatus";
import { useAppTheme } from "../../providers/AppThemeProvider";

type StatusPillProps = {
  status?: string | null;
  label?: string;
  style?: ViewStyle | ViewStyle[];
};

export default function StatusPill({
                                     status,
                                     label,
                                     style,
                                   }: StatusPillProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const tone = getOrderStatusTone(status);
  const isDark = resolvedTheme === "dark";

  const meta = (() => {
    switch (tone) {
      case "warning":
        return {
          backgroundColor: isDark ? "#3A2A12" : "#FEF3C7",
          textColor: isDark ? "#FCD34D" : "#92400E",
        };

      case "info":
        return {
          backgroundColor: isDark ? "#172554" : "#DBEAFE",
          textColor: isDark ? "#93C5FD" : "#1D4ED8",
        };

      case "success":
        return {
          backgroundColor: isDark ? "#14281D" : "#DCFCE7",
          textColor: isDark ? "#86EFAC" : "#166534",
        };

      case "danger":
        return {
          backgroundColor: isDark ? "#3A1719" : "#FEE2E2",
          textColor: isDark ? "#FCA5A5" : "#991B1B",
        };

      default:
        return {
          backgroundColor: colors.surfaceSecondary,
          textColor: colors.textSecondary,
        };
    }
  })();

  return (
      <View
          style={[
            styles.container,
            {
              backgroundColor: meta.backgroundColor,
            },
            style,
          ]}
      >
        <Text
            style={[
              styles.text,
              {
                color: meta.textColor,
              },
            ]}
        >
          {label || getOrderStatusLabel(status)}
        </Text>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  text: {
    fontSize: typography.caption,
    fontWeight: "800",
  },
});