import { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";

import AppCard from "../../components/ui/AppCard";
import ScreenSection from "../../components/ui/ScreenSection";
import { spacing } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

export default function PaymentsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Оплата" }} />

        <ScrollView contentContainerStyle={styles.content}>
          <ScreenSection
              title="Способы оплаты"
              description="Настройки оплаты пользователя"
          >
            <AppCard>
              <Text style={styles.text}>Здесь будет логика оплаты</Text>
            </AppCard>
          </ScreenSection>
        </ScrollView>
      </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    text: {
      color: colors.text,
    },
  });
}