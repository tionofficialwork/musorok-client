import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { radii, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type StatusPillProps = {
  status?: string | null;
  label?: string;
  style?: ViewStyle | ViewStyle[];
};

function normalizeStatus(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export default function StatusPill({
                                     status,
                                     label,
                                     style,
                                   }: StatusPillProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const normalized = normalizeStatus(status);

  const isDark = resolvedTheme === "dark";

  const getStatusMeta = () => {
    switch (normalized) {
      case "new":
      case "created":
        return {
          label: "Новый",
          backgroundColor: isDark ? "#3A2A12" : "#FEF3C7",
          textColor: isDark ? "#FCD34D" : "#92400E",
        };

      case "searching":
      case "pending":
        return {
          label: "Ищем курьера",
          backgroundColor: isDark ? "#172554" : "#DBEAFE",
          textColor: isDark ? "#93C5FD" : "#1D4ED8",
        };

      case "assigned":
      case "accepted":
        return {
          label: "Курьер назначен",
          backgroundColor: isDark ? "#2E1065" : "#E0E7FF",
          textColor: isDark ? "#C4B5FD" : "#4338CA",
        };

      case "in_progress":
      case "on_the_way":
        return {
          label: "В работе",
          backgroundColor: isDark ? "#14281D" : "#DCFCE7",
          textColor: isDark ? "#86EFAC" : "#166534",
        };

      case "completed":
      case "done":
        return {
          label: "Завершён",
          backgroundColor: isDark ? "#14281D" : "#DCFCE7",
          textColor: isDark ? "#86EFAC" : "#166534",
        };

      case "cancelled":
      case "canceled":
        return {
          label: "Отменён",
          backgroundColor: isDark ? "#3A1719" : "#FEE2E2",
          textColor: isDark ? "#FCA5A5" : "#991B1B",
        };

      default:
        return {
          label: status || "Статус неизвестен",
          backgroundColor: colors.surfaceSecondary,
          textColor: colors.textSecondary,
        };
    }
  };

  const meta = getStatusMeta();

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
          {label || meta.label}
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