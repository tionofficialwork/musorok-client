import React, { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { spacing, typography } from "../../lib/theme";
import { useAppTheme } from "../../providers/AppThemeProvider";

type ScreenSectionProps = {
    title?: string;
    subtitle?: string;
    description?: string;
    children: ReactNode;
    style?: ViewStyle | ViewStyle[];
    contentStyle?: ViewStyle | ViewStyle[];
};

export default function ScreenSection({
                                          title,
                                          subtitle,
                                          description,
                                          children,
                                          style,
                                          contentStyle,
                                      }: ScreenSectionProps) {
    const { colors } = useAppTheme();
    const resolvedSubtitle = subtitle ?? description;

    return (
        <View style={[styles.section, style]}>
            {(title || resolvedSubtitle) && (
                <View style={styles.header}>
                    {title ? (
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: colors.text,
                                },
                            ]}
                        >
                            {title}
                        </Text>
                    ) : null}

                    {resolvedSubtitle ? (
                        <Text
                            style={[
                                styles.subtitle,
                                {
                                    color: colors.textSecondary,
                                },
                            ]}
                        >
                            {resolvedSubtitle}
                        </Text>
                    ) : null}
                </View>
            )}

            <View style={contentStyle}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: spacing.xl,
    },
    header: {
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.h2,
        fontWeight: "800",
    },
    subtitle: {
        marginTop: 4,
        fontSize: typography.bodySmall,
        lineHeight: 20,
    },
});