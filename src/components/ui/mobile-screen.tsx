import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/lib/theme";

type MobileScreenProps = Readonly<{
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: readonly ("bottom" | "left" | "right" | "top")[];
  footer?: ReactNode;
  keyboardAvoiding?: boolean;
  scroll?: boolean;
  stickyHeader?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function MobileScreen({
  children,
  contentStyle,
  edges = ["top", "left", "right"],
  footer,
  keyboardAvoiding = false,
  scroll = true,
  stickyHeader,
  style,
  testID,
}: MobileScreenProps) {
  const insets = useSafeAreaInsets();
  const contentPadding = {
    paddingBottom: spacing.xl + insets.bottom,
    paddingLeft: spacing.xl + insets.left,
    paddingRight: spacing.xl + insets.right,
    paddingTop: spacing.xl,
  };
  const content = scroll ? (
    <>
      {stickyHeader ? <View style={[styles.stickyHeader, { paddingLeft: contentPadding.paddingLeft, paddingRight: contentPadding.paddingRight }]}>{stickyHeader}</View> : null}
      <ScrollView
        contentContainerStyle={[styles.content, contentPadding, stickyHeader ? styles.contentWithStickyHeader : null, contentStyle]}
        keyboardShouldPersistTaps="handled"
        testID={testID ? `${testID}-scroll` : undefined}
      >
        {children}
      </ScrollView>
    </>
  ) : (
    <View style={[styles.content, styles.flex, contentPadding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg },
  contentWithStickyHeader: { paddingTop: spacing.md },
  flex: { flex: 1 },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  stickyHeader: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
});
