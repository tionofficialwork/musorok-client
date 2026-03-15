import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type StatusPillProps = {
  status?: string | null;
  label?: string;
  style?: ViewStyle | ViewStyle[];
};

function normalizeStatus(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getStatusMeta(status?: string | null) {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "new":
    case "created":
      return {
        label: "Новый",
        backgroundColor: "#FEF3C7",
        textColor: "#92400E",
      };

    case "searching":
    case "pending":
      return {
        label: "Ищем курьера",
        backgroundColor: "#DBEAFE",
        textColor: "#1D4ED8",
      };

    case "assigned":
    case "accepted":
      return {
        label: "Курьер назначен",
        backgroundColor: "#E0E7FF",
        textColor: "#4338CA",
      };

    case "in_progress":
    case "on_the_way":
      return {
        label: "В работе",
        backgroundColor: "#DCFCE7",
        textColor: "#166534",
      };

    case "completed":
      return {
        label: "Завершён",
        backgroundColor: "#DCFCE7",
        textColor: "#166534",
      };

    case "cancelled":
    case "canceled":
      return {
        label: "Отменён",
        backgroundColor: "#FEE2E2",
        textColor: "#991B1B",
      };

    default:
      return {
        label: status || "Статус неизвестен",
        backgroundColor: "#F3F4F6",
        textColor: "#374151",
      };
  }
}

export default function StatusPill({
  status,
  label,
  style,
}: StatusPillProps) {
  const meta = getStatusMeta(status);

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
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
  },
});