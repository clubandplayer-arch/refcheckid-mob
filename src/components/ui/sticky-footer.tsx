import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/lib/theme";

type StickyFooterProps = Readonly<{
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}>;

export function StickyFooter({ children, style }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
