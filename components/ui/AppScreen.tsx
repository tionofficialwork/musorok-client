import { ReactNode, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type AppScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export default function AppScreen({
  children,
  scrollable = true,
  contentStyle,
  keyboardAvoiding = false,
  refreshControl,
}: AppScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scrollView = (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );

  const content = scrollable ? scrollView : <View style={styles.flex}>{children}</View>;

  if (keyboardAvoiding) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
  });
}
