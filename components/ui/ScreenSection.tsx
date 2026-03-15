import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type ScreenSectionProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenSection({
  children,
  style,
}: ScreenSectionProps) {
  return <View style={[styles.section, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
});