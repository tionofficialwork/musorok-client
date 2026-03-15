import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import AppButton from "./AppButton";

type ErrorCardProps = {
  title?: string;
  message: string;
  buttonTitle?: string;
  onRetry?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export default function ErrorCard({
  title = "Что-то пошло не так",
  message,
  buttonTitle = "Попробовать снова",
  onRetry,
  style,
}: ErrorCardProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry ? (
        <AppButton
          title={buttonTitle}
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 20,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#7F1D1D",
  },
  button: {
    marginTop: 14,
  },
});