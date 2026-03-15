import React, { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type ScreenSectionProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
};

export default function ScreenSection({
  title,
  subtitle,
  children,
  style,
  contentStyle,
}: ScreenSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}

      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
});